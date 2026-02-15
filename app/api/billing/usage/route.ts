import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "billing-usage"

const PlanSchema = z.enum(["free", "pro", "team", "enterprise"])

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("updatePlan"), payload: z.object({ plan: PlanSchema, seats: z.number().min(1).max(500) }) }),
  z.object({
    action: z.literal("recordUsage"),
    payload: z.object({
      metric: z.enum([
        "ai_requests",
        "job_captures",
        "inbox_sync_runs",
        "calendar_writebacks",
        "ats_sync_runs",
        "storage_mb",
      ]),
      units: z.number().min(1).max(100000).default(1),
    }),
  }),
])

type UsageMetricKey =
  | "ai_requests"
  | "job_captures"
  | "inbox_sync_runs"
  | "calendar_writebacks"
  | "ats_sync_runs"
  | "storage_mb"

type BillingState = {
  plan: "free" | "pro" | "team" | "enterprise"
  seats: number
  usage: Record<UsageMetricKey, number>
  updatedAt: string
}

const PLAN_LIMITS: Record<BillingState["plan"], Record<UsageMetricKey, number>> = {
  free: {
    ai_requests: 400,
    job_captures: 120,
    inbox_sync_runs: 40,
    calendar_writebacks: 40,
    ats_sync_runs: 20,
    storage_mb: 100,
  },
  pro: {
    ai_requests: 5000,
    job_captures: 1500,
    inbox_sync_runs: 400,
    calendar_writebacks: 500,
    ats_sync_runs: 250,
    storage_mb: 1000,
  },
  team: {
    ai_requests: 25000,
    job_captures: 8000,
    inbox_sync_runs: 1800,
    calendar_writebacks: 2200,
    ats_sync_runs: 1200,
    storage_mb: 8000,
  },
  enterprise: {
    ai_requests: 200000,
    job_captures: 80000,
    inbox_sync_runs: 30000,
    calendar_writebacks: 50000,
    ats_sync_runs: 30000,
    storage_mb: 100000,
  },
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function defaultState(): BillingState {
  return {
    plan: "free",
    seats: 1,
    usage: {
      ai_requests: 0,
      job_captures: 0,
      inbox_sync_runs: 0,
      calendar_writebacks: 0,
      ats_sync_runs: 0,
      storage_mb: 0,
    },
    updatedAt: new Date().toISOString(),
  }
}

function sanitizeState(input: unknown): BillingState {
  if (!input || typeof input !== "object") return defaultState()
  const payload = input as Record<string, unknown>
  const plan = payload.plan === "pro" || payload.plan === "team" || payload.plan === "enterprise" ? payload.plan : "free"
  const usageRaw = (payload.usage || {}) as Record<string, unknown>
  return {
    plan,
    seats: Math.max(1, Math.min(500, Math.round(Number(payload.seats || 1)))),
    usage: {
      ai_requests: Math.max(0, Math.round(Number(usageRaw.ai_requests || 0))),
      job_captures: Math.max(0, Math.round(Number(usageRaw.job_captures || 0))),
      inbox_sync_runs: Math.max(0, Math.round(Number(usageRaw.inbox_sync_runs || 0))),
      calendar_writebacks: Math.max(0, Math.round(Number(usageRaw.calendar_writebacks || 0))),
      ats_sync_runs: Math.max(0, Math.round(Number(usageRaw.ats_sync_runs || 0))),
      storage_mb: Math.max(0, Math.round(Number(usageRaw.storage_mb || 0))),
    },
    updatedAt: safeIso(typeof payload.updatedAt === "string" ? payload.updatedAt : null) || new Date().toISOString(),
  }
}

function buildUsageSummary(state: BillingState) {
  const limits = PLAN_LIMITS[state.plan]
  const usage = state.usage
  const meters = (Object.keys(usage) as UsageMetricKey[]).map((metric) => {
    const used = usage[metric]
    const limit = limits[metric] * Math.max(1, state.seats)
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0
    return {
      metric,
      used,
      limit,
      percent,
      overage: Math.max(0, used - limit),
    }
  })
  return {
    plan: state.plan,
    seats: state.seats,
    meters,
    overageCount: meters.filter((meter) => meter.overage > 0).length,
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<BillingState>(supabase, userId, STORAGE_KEY, defaultState(), sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`billing-usage:get:${getClientIp(request)}`, 120, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    return ok({ success: true, state: module.state, summary: buildUsageSummary(module.state) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing usage"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`billing-usage:post:${getClientIp(request)}`, 80, 60_000)
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

    if (body.action === "updatePlan") {
      nextState = {
        ...state,
        plan: body.payload.plan,
        seats: body.payload.seats,
        updatedAt: now,
      }
    }

    if (body.action === "recordUsage") {
      nextState = {
        ...state,
        usage: {
          ...state.usage,
          [body.payload.metric]: state.usage[body.payload.metric] + body.payload.units,
        },
        updatedAt: now,
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({ success: true, state: nextState, summary: buildUsageSummary(nextState) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update billing usage"
    return fail(message, 500)
  }
}
