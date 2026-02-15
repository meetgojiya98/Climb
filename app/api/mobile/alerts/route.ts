import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "mobile-alerts"

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("registerDevice"),
    payload: z.object({
      platform: z.enum(["ios", "android", "web"]),
      label: z.string().min(2).max(80),
      token: z.string().min(8).max(260),
    }),
  }),
  z.object({
    action: z.literal("createAlert"),
    payload: z.object({
      title: z.string().min(2).max(120),
      body: z.string().min(2).max(500),
      deepLink: z.string().max(220).optional(),
    }),
  }),
  z.object({
    action: z.literal("markRead"),
    payload: z.object({ alertId: z.string().min(1) }),
  }),
  z.object({ action: z.literal("markAllRead"), payload: z.object({}) }),
  z.object({
    action: z.literal("touchDevice"),
    payload: z.object({ deviceId: z.string().min(1) }),
  }),
])

type MobileState = {
  devices: Array<{
    id: string
    platform: "ios" | "android" | "web"
    label: string
    tokenLast6: string
    registeredAt: string
    lastSeenAt: string
  }>
  alerts: Array<{
    id: string
    title: string
    body: string
    deepLink: string | null
    status: "unread" | "read"
    createdAt: string
  }>
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): MobileState {
  if (!input || typeof input !== "object") return { devices: [], alerts: [] }
  const payload = input as { devices?: unknown[]; alerts?: unknown[] }

  const devices = Array.isArray(payload.devices)
    ? payload.devices
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const platform = value.platform === "ios" || value.platform === "android" ? value.platform : "web"
          if (typeof value.id !== "string" || typeof value.label !== "string" || typeof value.tokenLast6 !== "string") return null
          return {
            id: value.id,
            platform,
            label: value.label,
            tokenLast6: value.tokenLast6,
            registeredAt: safeIso(typeof value.registeredAt === "string" ? value.registeredAt : null) || new Date().toISOString(),
            lastSeenAt: safeIso(typeof value.lastSeenAt === "string" ? value.lastSeenAt : null) || new Date().toISOString(),
          }
        })
        .filter((item): item is MobileState["devices"][number] => Boolean(item))
        .slice(-50)
    : []

  const alerts = Array.isArray(payload.alerts)
    ? payload.alerts
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          if (typeof value.id !== "string" || typeof value.title !== "string" || typeof value.body !== "string") return null
          return {
            id: value.id,
            title: value.title,
            body: value.body,
            deepLink: typeof value.deepLink === "string" ? value.deepLink : null,
            status: value.status === "read" ? "read" : "unread",
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
          }
        })
        .filter((item): item is MobileState["alerts"][number] => Boolean(item))
        .slice(-300)
    : []

  return { devices, alerts }
}

function buildNextBestAction(applications: Array<{ status: string | null; company: string | null; position: string | null }>) {
  const stale = applications.filter((item) => {
    const status = String(item.status || "").toLowerCase()
    return status === "applied" || status === "screening"
  }).slice(0, 3)

  if (stale.length === 0) {
    return {
      title: "No urgent pipeline blocker",
      body: "Run one interview practice rep and one role discovery sprint.",
      deepLink: "/app/interviews",
    }
  }

  const top = stale[0]
  return {
    title: `Follow-up needed: ${top.company || "Target company"}`,
    body: `Send follow-up for ${top.position || "active role"} and refresh next action timer.`,
    deepLink: "/app/applications",
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<MobileState>(supabase, userId, STORAGE_KEY, { devices: [], alerts: [] }, sanitizeState)
}

function buildSummary(state: MobileState) {
  const unread = state.alerts.filter((item) => item.status === "unread").length
  const lastAlertAt = state.alerts
    .map((item) => item.createdAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
  return {
    devices: {
      total: state.devices.length,
      ios: state.devices.filter((item) => item.platform === "ios").length,
      android: state.devices.filter((item) => item.platform === "android").length,
      web: state.devices.filter((item) => item.platform === "web").length,
    },
    alerts: {
      total: state.alerts.length,
      unread,
      read: state.alerts.length - unread,
      lastAlertAt,
    },
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`mobile-alerts:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const applications = await fetchApplicationsCompatible(supabase, user.id)
    const nextBestAction = buildNextBestAction(applications)

    return ok({
      success: true,
      devices: module.state.devices,
      alerts: module.state.alerts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50),
      nextBestAction,
      summary: buildSummary(module.state),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load mobile alerts"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`mobile-alerts:post:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const state = module.state
    const now = new Date().toISOString()
    let nextState = state

    if (body.action === "registerDevice") {
      const device: MobileState["devices"][number] = {
        id: generateId("device"),
        platform: body.payload.platform,
        label: body.payload.label,
        tokenLast6: body.payload.token.slice(-6),
        registeredAt: now,
        lastSeenAt: now,
      }
      nextState = {
        ...state,
        devices: [...state.devices, device].slice(-50),
      }
    }

    if (body.action === "createAlert") {
      const alert: MobileState["alerts"][number] = {
        id: generateId("alert"),
        title: body.payload.title,
        body: body.payload.body,
        deepLink: body.payload.deepLink || null,
        status: "unread",
        createdAt: now,
      }
      nextState = {
        ...state,
        alerts: [...state.alerts, alert].slice(-300),
      }
    }

    if (body.action === "markRead") {
      nextState = {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === body.payload.alertId
            ? { ...alert, status: "read" }
            : alert
        ),
      }
    }

    if (body.action === "markAllRead") {
      nextState = {
        ...state,
        alerts: state.alerts.map((alert) => ({ ...alert, status: "read" })),
      }
    }

    if (body.action === "touchDevice") {
      nextState = {
        ...state,
        devices: state.devices.map((device) =>
          device.id === body.payload.deviceId
            ? { ...device, lastSeenAt: now }
            : device
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      success: true,
      devices: nextState.devices,
      alerts: nextState.alerts,
      summary: buildSummary(nextState),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update mobile alerts"
    return fail(message, 500)
  }
}
