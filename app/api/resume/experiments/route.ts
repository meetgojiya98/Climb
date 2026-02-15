import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { readUserFeatureState, writeUserFeatureState } from "@/lib/feature-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "resume-experiments"

const EventStageSchema = z.enum(["sent", "reply", "interview", "offer", "rejected"])

const LogEventSchema = z.object({
  variantId: z.string().min(1).max(80),
  variantName: z.string().min(1).max(120),
  company: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  stage: EventStageSchema,
  notes: z.string().max(600).optional(),
  occurredAt: z.string().optional(),
})

type EventStage = z.infer<typeof EventStageSchema>

type ResumeExperimentEvent = {
  id: string
  variantId: string
  variantName: string
  company: string
  role: string
  stage: EventStage
  notes: string | null
  occurredAt: string
}

type ResumeExperimentState = {
  events: ResumeExperimentEvent[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function buildVariantAnalytics(events: ResumeExperimentEvent[]) {
  const grouped = new Map<string, { variantId: string; variantName: string; events: ResumeExperimentEvent[] }>()

  for (const event of events) {
    const key = event.variantId
    if (!grouped.has(key)) {
      grouped.set(key, {
        variantId: event.variantId,
        variantName: event.variantName,
        events: [],
      })
    }
    grouped.get(key)?.events.push(event)
  }

  const rows = Array.from(grouped.values()).map((group) => {
    const sent = group.events.filter((event) => event.stage === "sent").length
    const reply = group.events.filter((event) => event.stage === "reply").length
    const interview = group.events.filter((event) => event.stage === "interview").length
    const offer = group.events.filter((event) => event.stage === "offer").length
    const rejected = group.events.filter((event) => event.stage === "rejected").length

    const replyRate = sent > 0 ? Math.round((reply / sent) * 100) : 0
    const interviewRate = sent > 0 ? Math.round((interview / sent) * 100) : 0
    const offerRate = sent > 0 ? Math.round((offer / sent) * 100) : 0
    return {
      variantId: group.variantId,
      variantName: group.variantName,
      sent,
      reply,
      interview,
      offer,
      rejected,
      replyRate,
      interviewRate,
      offerRate,
    }
  })

  rows.sort((a, b) => {
    if (b.offerRate !== a.offerRate) return b.offerRate - a.offerRate
    if (b.interviewRate !== a.interviewRate) return b.interviewRate - a.interviewRate
    return b.replyRate - a.replyRate
  })

  return rows
}

function buildAttributionMatrix(events: ResumeExperimentEvent[], key: "company" | "role") {
  const matrix = new Map<string, { sent: number; reply: number; interview: number; offer: number }>()

  for (const event of events) {
    const label = key === "company" ? event.company : event.role
    const normalized = normalizeText(label) || "unknown"
    if (!matrix.has(normalized)) {
      matrix.set(normalized, { sent: 0, reply: 0, interview: 0, offer: 0 })
    }
    const row = matrix.get(normalized)!
    if (event.stage === "sent") row.sent += 1
    if (event.stage === "reply") row.reply += 1
    if (event.stage === "interview") row.interview += 1
    if (event.stage === "offer") row.offer += 1
  }

  return Array.from(matrix.entries())
    .map(([label, stats]) => ({
      label,
      ...stats,
      replyRate: stats.sent > 0 ? Math.round((stats.reply / stats.sent) * 100) : 0,
      interviewRate: stats.sent > 0 ? Math.round((stats.interview / stats.sent) * 100) : 0,
      offerRate: stats.sent > 0 ? Math.round((stats.offer / stats.sent) * 100) : 0,
    }))
    .sort((a, b) => b.offerRate - a.offerRate || b.interviewRate - a.interviewRate || b.replyRate - a.replyRate)
    .slice(0, 10)
}

function sanitizeState(input: unknown): ResumeExperimentState {
  if (!input || typeof input !== "object") return { events: [] }
  const value = input as { events?: unknown[] }
  if (!Array.isArray(value.events)) return { events: [] }
  const events = value.events
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const candidate = item as Record<string, unknown>
      const stage = EventStageSchema.safeParse(candidate.stage)
      if (!stage.success) return null
      const occurredAt = typeof candidate.occurredAt === "string" ? candidate.occurredAt : new Date().toISOString()
      return {
        id: typeof candidate.id === "string" ? candidate.id : "",
        variantId: typeof candidate.variantId === "string" ? candidate.variantId : "",
        variantName: typeof candidate.variantName === "string" ? candidate.variantName : "",
        company: typeof candidate.company === "string" ? candidate.company : "",
        role: typeof candidate.role === "string" ? candidate.role : "",
        stage: stage.data,
        notes: typeof candidate.notes === "string" ? candidate.notes : null,
        occurredAt,
      } satisfies ResumeExperimentEvent
    })
    .filter((item): item is ResumeExperimentEvent => Boolean(item && item.id && item.variantId && item.variantName))
    .slice(-1200)
  return { events }
}

async function loadState(supabase: any, userId: string) {
  const store = await readUserFeatureState<ResumeExperimentState>(supabase, userId, STORAGE_KEY, {
    events: [],
  })
  return {
    state: sanitizeState(store.data),
    recordId: store.recordId,
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`resume-experiments:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await loadState(supabase, user.id)
    const events = [...state.events].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    const variants = buildVariantAnalytics(events)
    const attributionByCompany = buildAttributionMatrix(events, "company")
    const attributionByRole = buildAttributionMatrix(events, "role")

    return ok({
      success: true,
      analytics: {
        totalEvents: events.length,
        variants,
        attributionByCompany,
        attributionByRole,
      },
      events: events.slice(0, 300),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load resume experiments"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`resume-experiments:post:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, LogEventSchema)
    const { state, recordId } = await loadState(supabase, user.id)
    const event: ResumeExperimentEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      variantId: body.variantId.trim(),
      variantName: body.variantName.trim(),
      company: body.company.trim(),
      role: body.role.trim(),
      stage: body.stage,
      notes: body.notes?.trim() || null,
      occurredAt: body.occurredAt && !Number.isNaN(Date.parse(body.occurredAt))
        ? new Date(body.occurredAt).toISOString()
        : new Date().toISOString(),
    }

    const nextState: ResumeExperimentState = {
      events: [...state.events, event].slice(-1200),
    }

    await writeUserFeatureState(supabase, user.id, STORAGE_KEY, nextState, { recordId })

    const variants = buildVariantAnalytics(nextState.events)

    return ok({
      success: true,
      event,
      leaderboard: variants.slice(0, 8),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log experiment event"
    return fail(message, 500)
  }
}

