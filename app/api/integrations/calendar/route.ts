import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "integrations-calendar"

const ConnectSchema = z.object({
  provider: z.enum(["google", "outlook"]),
  email: z.string().email(),
  defaultCalendar: z.string().min(2).max(120).default("Primary"),
  writeBackEnabled: z.boolean().default(true),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), payload: ConnectSchema }),
  z.object({
    action: z.literal("update"),
    payload: z.object({
      accountId: z.string().min(1),
      writeBackEnabled: z.boolean().optional(),
      defaultCalendar: z.string().min(2).max(120).optional(),
    }),
  }),
  z.object({ action: z.literal("disconnect"), payload: z.object({ accountId: z.string().min(1) }) }),
])

type CalendarAccount = {
  id: string
  provider: "google" | "outlook"
  email: string
  defaultCalendar: string
  writeBackEnabled: boolean
  status: "connected" | "disconnected"
  connectedAt: string
  lastWriteBackAt: string | null
}

type CalendarState = {
  accounts: CalendarAccount[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): CalendarState {
  if (!input || typeof input !== "object") return { accounts: [] }
  const payload = input as { accounts?: unknown[] }
  if (!Array.isArray(payload.accounts)) return { accounts: [] }

  const accounts = payload.accounts
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      const provider = value.provider === "google" || value.provider === "outlook" ? value.provider : null
      if (!provider || typeof value.id !== "string" || typeof value.email !== "string") return null
      return {
        id: value.id,
        provider,
        email: value.email,
        defaultCalendar: typeof value.defaultCalendar === "string" ? value.defaultCalendar : "Primary",
        writeBackEnabled: value.writeBackEnabled !== false,
        status: value.status === "disconnected" ? "disconnected" : "connected",
        connectedAt: safeIso(typeof value.connectedAt === "string" ? value.connectedAt : null) || new Date().toISOString(),
        lastWriteBackAt: safeIso(typeof value.lastWriteBackAt === "string" ? value.lastWriteBackAt : null),
      } satisfies CalendarAccount
    })
    .filter((item): item is CalendarAccount => Boolean(item))
    .slice(-10)

  return { accounts }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<CalendarState>(supabase, userId, STORAGE_KEY, { accounts: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`calendar-integrations:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await readState(supabase, user.id)
    return ok({ success: true, accounts: state.accounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load calendar integrations"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`calendar-integrations:post:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state, recordId } = await readState(supabase, user.id)
    const now = new Date().toISOString()
    let nextState = state

    if (body.action === "connect") {
      const payload = body.payload
      const existing = state.accounts.find(
        (item) => item.provider === payload.provider && item.email.toLowerCase() === payload.email.toLowerCase()
      )
      if (existing) {
        nextState = {
          accounts: state.accounts.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  status: "connected",
                  writeBackEnabled: payload.writeBackEnabled,
                  defaultCalendar: payload.defaultCalendar,
                  connectedAt: now,
                }
              : item
          ),
        }
      } else {
        const account: CalendarAccount = {
          id: generateId("calendar"),
          provider: payload.provider,
          email: payload.email,
          defaultCalendar: payload.defaultCalendar,
          writeBackEnabled: payload.writeBackEnabled,
          status: "connected",
          connectedAt: now,
          lastWriteBackAt: null,
        }
        nextState = {
          accounts: [...state.accounts, account].slice(-10),
        }
      }
    }

    if (body.action === "update") {
      nextState = {
        accounts: state.accounts.map((item) =>
          item.id === body.payload.accountId
            ? {
                ...item,
                writeBackEnabled: body.payload.writeBackEnabled ?? item.writeBackEnabled,
                defaultCalendar: body.payload.defaultCalendar ?? item.defaultCalendar,
              }
            : item
        ),
      }
    }

    if (body.action === "disconnect") {
      nextState = {
        accounts: state.accounts.map((item) =>
          item.id === body.payload.accountId
            ? {
                ...item,
                status: "disconnected",
                writeBackEnabled: false,
              }
            : item
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, recordId)
    return ok({ success: true, accounts: nextState.accounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update calendar integrations"
    return fail(message, 500)
  }
}
