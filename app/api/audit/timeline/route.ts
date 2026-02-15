import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "audit-local-events"

const PostSchema = z.object({
  eventType: z.string().min(2).max(120),
  metadata: z.record(z.any()).optional(),
  workspaceId: z.string().max(120).optional(),
})

type LocalAuditState = {
  events: Array<{
    id: string
    eventType: string
    metadata: Record<string, unknown>
    workspaceId: string | null
    createdAt: string
  }>
}

type UnifiedEvent = {
  id: string
  source: "supabase" | "local"
  eventType: string
  workspaceId: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeLocalState(input: unknown): LocalAuditState {
  if (!input || typeof input !== "object") return { events: [] }
  const payload = input as { events?: unknown[] }
  if (!Array.isArray(payload.events)) return { events: [] }

  const events = payload.events
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if (typeof value.id !== "string" || typeof value.eventType !== "string") return null
      return {
        id: value.id,
        eventType: value.eventType,
        metadata: value.metadata && typeof value.metadata === "object" ? (value.metadata as Record<string, unknown>) : {},
        workspaceId: typeof value.workspaceId === "string" ? value.workspaceId : null,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
      }
    })
    .filter((item): item is LocalAuditState["events"][number] => Boolean(item))
    .slice(-1000)

  return { events }
}

function toCsv(events: UnifiedEvent[]) {
  const headers = ["id", "source", "eventType", "workspaceId", "createdAt", "metadata"]
  const lines = [headers.join(",")]
  for (const event of events) {
    const row = [
      event.id,
      event.source,
      event.eventType,
      event.workspaceId || "",
      event.createdAt,
      JSON.stringify(event.metadata || {}),
    ].map((value) => {
      const text = String(value || "")
      if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replace(/\"/g, '""')}"`
      }
      return text
    })
    lines.push(row.join(","))
  }
  return lines.join("\n")
}

function isMissingRelationError(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("relation")
  )
}

function summarizeEvents(events: UnifiedEvent[]) {
  const bySource = {
    supabase: events.filter((item) => item.source === "supabase").length,
    local: events.filter((item) => item.source === "local").length,
  }
  const byEventType = events.reduce<Record<string, number>>((acc, item) => {
    acc[item.eventType] = (acc[item.eventType] || 0) + 1
    return acc
  }, {})
  return {
    total: events.length,
    bySource,
    topEventTypes: Object.entries(byEventType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([eventType, count]) => ({ eventType, count })),
    latestAt: events[0]?.createdAt || null,
  }
}

async function readLocalState(supabase: any, userId: string) {
  return loadModuleState<LocalAuditState>(
    supabase,
    userId,
    STORAGE_KEY,
    { events: [] },
    sanitizeLocalState
  )
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`audit-timeline:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const exportCsv = request.nextUrl.searchParams.get("format") === "csv"
    const eventTypeFilter = request.nextUrl.searchParams.get("eventType")
    const workspaceFilter = request.nextUrl.searchParams.get("workspaceId")
    const sourceFilter = request.nextUrl.searchParams.get("source")
    const limit = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get("limit") || 600)))
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const unified: UnifiedEvent[] = []

    const remote = await supabase
      .from("audit_events")
      .select("id, event_type, workspace_id, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)

    if (!remote.error && Array.isArray(remote.data)) {
      for (const row of remote.data) {
        unified.push({
          id: String(row.id),
          source: "supabase",
          eventType: String((row as any).event_type || "unknown"),
          workspaceId: typeof (row as any).workspace_id === "string" ? (row as any).workspace_id : null,
          createdAt: safeIso(String((row as any).created_at || "")) || new Date().toISOString(),
          metadata: ((row as any).metadata && typeof (row as any).metadata === "object" ? (row as any).metadata : {}) as Record<string, unknown>,
        })
      }
    } else if (remote.error && !isMissingRelationError(String(remote.error.message || ""))) {
      throw remote.error
    }

    const local = await readLocalState(supabase, user.id)
    for (const item of local.state.events) {
      unified.push({
        id: item.id,
        source: "local",
        eventType: item.eventType,
        workspaceId: item.workspaceId,
        createdAt: item.createdAt,
        metadata: item.metadata,
      })
    }

    const events = unified
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((item) => !eventTypeFilter || item.eventType === eventTypeFilter)
      .filter((item) => !workspaceFilter || item.workspaceId === workspaceFilter)
      .filter((item) => !sourceFilter || item.source === sourceFilter)
      .slice(0, limit)

    if (exportCsv) {
      const csv = toCsv(events)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=audit-timeline.csv",
        },
      })
    }

    return ok({ success: true, count: events.length, events, summary: summarizeEvents(events) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit timeline"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`audit-timeline:post:${getClientIp(request)}`, 50, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, PostSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readLocalState(supabase, user.id)
    const event = {
      id: generateId("audit"),
      eventType: body.eventType,
      metadata: body.metadata || {},
      workspaceId: body.workspaceId || null,
      createdAt: new Date().toISOString(),
    }

    const nextState: LocalAuditState = {
      events: [...module.state.events, event].slice(-1000),
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({ success: true, event, localEventCount: nextState.events.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add audit event"
    return fail(message, 500)
  }
}
