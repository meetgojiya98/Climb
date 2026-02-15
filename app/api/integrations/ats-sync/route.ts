import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "integrations-ats-sync"

const ConnectorSchema = z.object({
  provider: z.enum(["greenhouse", "lever", "workday"]),
  workspace: z.string().max(120).optional(),
  syncMode: z.enum(["manual", "hourly", "daily"]).default("hourly"),
})

const ImportItemSchema = z.object({
  company: z.string().min(1).max(120),
  position: z.string().min(1).max(160),
  status: z.string().min(2).max(80),
  applied_date: z.string().optional(),
  job_url: z.string().url().optional(),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), payload: ConnectorSchema }),
  z.object({ action: z.literal("disconnect"), payload: z.object({ connectorId: z.string().min(1) }) }),
  z.object({
    action: z.literal("setSyncMode"),
    payload: z.object({
      connectorId: z.string().min(1),
      syncMode: z.enum(["manual", "hourly", "daily"]),
    }),
  }),
  z.object({
    action: z.literal("runSync"),
    payload: z.object({
      connectorId: z.string().min(1),
      importedItems: z.array(ImportItemSchema).max(120).optional(),
    }),
  }),
])

type AtsConnector = {
  id: string
  provider: "greenhouse" | "lever" | "workday"
  workspace: string | null
  syncMode: "manual" | "hourly" | "daily"
  status: "connected" | "disconnected"
  connectedAt: string
  lastSyncAt: string | null
  totalSynced: number
}

type AtsSyncRun = {
  id: string
  connectorId: string
  provider: "greenhouse" | "lever" | "workday"
  importedCount: number
  updatedCount: number
  createdCount: number
  skippedCount: number
  createdAt: string
}

type AtsState = {
  connectors: AtsConnector[]
  syncRuns: AtsSyncRun[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): AtsState {
  if (!input || typeof input !== "object") return { connectors: [], syncRuns: [] }
  const payload = input as { connectors?: unknown[]; syncRuns?: unknown[] }

  const connectors = Array.isArray(payload.connectors)
    ? payload.connectors
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const provider =
            value.provider === "greenhouse" || value.provider === "lever" || value.provider === "workday"
              ? value.provider
              : null
          if (!provider || typeof value.id !== "string") return null
          const syncMode = value.syncMode === "manual" || value.syncMode === "daily" ? value.syncMode : "hourly"
          return {
            id: value.id,
            provider,
            workspace: typeof value.workspace === "string" ? value.workspace : null,
            syncMode,
            status: value.status === "disconnected" ? "disconnected" : "connected",
            connectedAt: safeIso(typeof value.connectedAt === "string" ? value.connectedAt : null) || new Date().toISOString(),
            lastSyncAt: safeIso(typeof value.lastSyncAt === "string" ? value.lastSyncAt : null),
            totalSynced: Math.max(0, Math.round(Number(value.totalSynced || 0))),
          } satisfies AtsConnector
        })
        .filter((item): item is AtsConnector => Boolean(item))
        .slice(-20)
    : []

  const syncRuns = Array.isArray(payload.syncRuns)
    ? payload.syncRuns
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const provider =
            value.provider === "greenhouse" || value.provider === "lever" || value.provider === "workday"
              ? value.provider
              : null
          if (!provider || typeof value.id !== "string" || typeof value.connectorId !== "string") return null
          return {
            id: value.id,
            connectorId: value.connectorId,
            provider,
            importedCount: Math.max(0, Math.round(Number(value.importedCount || 0))),
            updatedCount: Math.max(0, Math.round(Number(value.updatedCount || 0))),
            createdCount: Math.max(0, Math.round(Number(value.createdCount || 0))),
            skippedCount: Math.max(0, Math.round(Number(value.skippedCount || 0))),
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
          } satisfies AtsSyncRun
        })
        .filter((item): item is AtsSyncRun => Boolean(item))
        .slice(-120)
    : []

  return { connectors, syncRuns }
}

async function updateApplicationSafely(supabase: any, applicationId: string, patch: Record<string, unknown>) {
  let workingPatch = { ...patch }
  let result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  if (!result.error) return { ok: true as const }

  const message = String(result.error.message || "").toLowerCase()
  if (message.includes("job_url")) {
    const { job_url, ...rest } = workingPatch as Record<string, unknown>
    workingPatch = rest
    result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  }

  if (result.error) return { ok: false as const, error: String(result.error.message || "Update failed") }
  return { ok: true as const }
}

async function createApplicationSafely(
  supabase: any,
  input: {
    userId: string
    company: string
    position: string
    status: string
    appliedDate?: string
    jobUrl?: string
  }
) {
  const basePayload = {
    user_id: input.userId,
    company: input.company,
    position: input.position,
    status: input.status,
    applied_date: input.appliedDate || new Date().toISOString().slice(0, 10),
    job_url: input.jobUrl || null,
    notes: "Synced from ATS connector",
  }

  const inserted = await supabase.from("applications").insert(basePayload).select("id").single()
  if (!inserted.error) return { ok: true as const, id: String(inserted.data.id) }

  const message = String(inserted.error.message || "").toLowerCase()
  if (message.includes("job_url")) {
    const { job_url, ...fallback } = basePayload
    const insertedFallback = await supabase.from("applications").insert(fallback).select("id").single()
    if (!insertedFallback.error) return { ok: true as const, id: String(insertedFallback.data.id) }
    return { ok: false as const, error: String(insertedFallback.error.message || "Insert failed") }
  }

  return { ok: false as const, error: String(inserted.error.message || "Insert failed") }
}

function normalizeStatus(value: string) {
  const text = value.toLowerCase()
  if (text.includes("interview")) return "interview"
  if (text.includes("screen")) return "screening"
  if (text.includes("offer")) return "offer"
  if (text.includes("reject")) return "rejected"
  if (text.includes("withdraw")) return "withdrawn"
  return "applied"
}

function sampleImportItems(provider: "greenhouse" | "lever" | "workday") {
  return [
    {
      company: provider === "greenhouse" ? "Stripe" : provider === "lever" ? "Airbnb" : "Meta",
      position: provider === "workday" ? "Product Manager" : "Senior Software Engineer",
      status: "screening",
      applied_date: new Date().toISOString().slice(0, 10),
      job_url: "https://example.com/job-sync",
    },
    {
      company: "Figma",
      position: "Staff Product Designer",
      status: "interview",
      applied_date: new Date().toISOString().slice(0, 10),
      job_url: "https://example.com/job-sync-2",
    },
  ]
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<AtsState>(
    supabase,
    userId,
    STORAGE_KEY,
    { connectors: [], syncRuns: [] },
    sanitizeState
  )
}

function buildSummary(state: AtsState) {
  const connected = state.connectors.filter((item) => item.status === "connected")
  const totalImports = state.syncRuns.reduce((sum, run) => sum + run.importedCount, 0)
  const totalSkipped = state.syncRuns.reduce((sum, run) => sum + run.skippedCount, 0)
  const totalApplied = state.syncRuns.reduce((sum, run) => sum + run.updatedCount + run.createdCount, 0)
  const successRate = totalImports > 0 ? Math.round((totalApplied / totalImports) * 100) : 0
  const lastRunAt = state.syncRuns
    .map((item) => item.createdAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
  return {
    connectors: {
      total: state.connectors.length,
      connected: connected.length,
      byProvider: {
        greenhouse: connected.filter((item) => item.provider === "greenhouse").length,
        lever: connected.filter((item) => item.provider === "lever").length,
        workday: connected.filter((item) => item.provider === "workday").length,
      },
    },
    runs: {
      total: state.syncRuns.length,
      lastRunAt,
      totalImports,
      totalApplied,
      totalSkipped,
      successRate,
    },
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`ats-sync:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await readState(supabase, user.id)
    return ok({
      success: true,
      connectors: state.connectors,
      syncRuns: [...state.syncRuns].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20),
      summary: buildSummary(state),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ATS sync state"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`ats-sync:post:${getClientIp(request)}`, 40, 60_000)
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

    if (body.action === "connect") {
      const existing = state.connectors.find(
        (item) => item.provider === body.payload.provider && (item.workspace || "") === (body.payload.workspace || "")
      )
      if (existing) {
        nextState = {
          ...state,
          connectors: state.connectors.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  status: "connected",
                  syncMode: body.payload.syncMode,
                  connectedAt: now,
                }
              : item
          ),
        }
      } else {
        const connector: AtsConnector = {
          id: generateId("ats"),
          provider: body.payload.provider,
          workspace: body.payload.workspace || null,
          syncMode: body.payload.syncMode,
          status: "connected",
          connectedAt: now,
          lastSyncAt: null,
          totalSynced: 0,
        }
        nextState = {
          ...state,
          connectors: [...state.connectors, connector].slice(-20),
        }
      }
    }

    if (body.action === "disconnect") {
      nextState = {
        ...state,
        connectors: state.connectors.map((item) =>
          item.id === body.payload.connectorId
            ? { ...item, status: "disconnected" }
            : item
        ),
      }
    }

    if (body.action === "setSyncMode") {
      nextState = {
        ...state,
        connectors: state.connectors.map((item) =>
          item.id === body.payload.connectorId
            ? { ...item, syncMode: body.payload.syncMode }
            : item
        ),
      }
    }

    if (body.action === "runSync") {
      const connector = state.connectors.find((item) => item.id === body.payload.connectorId)
      if (!connector || connector.status !== "connected") {
        return fail("Connector not found or disconnected", 404)
      }

      const imports = body.payload.importedItems && body.payload.importedItems.length > 0
        ? body.payload.importedItems
        : sampleImportItems(connector.provider)

      const applications = await fetchApplicationsCompatible(supabase, user.id)
      let updatedCount = 0
      let createdCount = 0
      let skippedCount = 0

      for (const item of imports) {
        const matched = applications.find(
          (app) =>
            String(app.company || "").toLowerCase() === item.company.toLowerCase() &&
            String(app.position || "").toLowerCase() === item.position.toLowerCase()
        )

        if (matched) {
          const persisted = await updateApplicationSafely(supabase, matched.id, {
            status: normalizeStatus(item.status),
            applied_date: item.applied_date || matched.applied_date,
            job_url: item.job_url || null,
          })
          if (!persisted.ok) {
            skippedCount += 1
            continue
          }
          updatedCount += 1
          continue
        }

        const created = await createApplicationSafely(supabase, {
          userId: user.id,
          company: item.company,
          position: item.position,
          status: normalizeStatus(item.status),
          appliedDate: item.applied_date,
          jobUrl: item.job_url,
        })
        if (!created.ok) {
          skippedCount += 1
          continue
        }
        createdCount += 1
      }

      const run: AtsSyncRun = {
        id: generateId("ats-run"),
        connectorId: connector.id,
        provider: connector.provider,
        importedCount: imports.length,
        updatedCount,
        createdCount,
        skippedCount,
        createdAt: now,
      }

      nextState = {
        connectors: state.connectors.map((item) =>
          item.id === connector.id
            ? {
                ...item,
                lastSyncAt: now,
                totalSynced: item.totalSynced + imports.length,
              }
            : item
        ),
        syncRuns: [...state.syncRuns, run].slice(-120),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      success: true,
      connectors: nextState.connectors,
      syncRuns: [...nextState.syncRuns].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20),
      summary: buildSummary(nextState),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ATS sync"
    return fail(message, 500)
  }
}
