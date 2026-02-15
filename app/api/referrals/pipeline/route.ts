import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "referrals-pipeline"

const SequenceStepSchema = z.object({
  label: z.string().min(2).max(160),
  dueAt: z.string().optional(),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addOpportunity"),
    payload: z.object({
      company: z.string().min(1).max(120),
      role: z.string().min(2).max(160),
      contactName: z.string().min(2).max(120),
      warmPath: z.string().max(220).optional(),
      introScore: z.number().min(1).max(100).default(60),
      steps: z.array(SequenceStepSchema).min(1).max(12).optional(),
    }),
  }),
  z.object({
    action: z.literal("advanceStep"),
    payload: z.object({
      opportunityId: z.string().min(1),
      stepId: z.string().min(1),
      done: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal("setOutcome"),
    payload: z.object({
      opportunityId: z.string().min(1),
      outcome: z.enum(["pending", "intro_sent", "referral_submitted", "interview", "rejected"]),
    }),
  }),
])

type ReferralStep = {
  id: string
  label: string
  dueAt: string | null
  done: boolean
}

type ReferralOpportunity = {
  id: string
  company: string
  role: string
  contactName: string
  warmPath: string | null
  introScore: number
  outcome: "pending" | "intro_sent" | "referral_submitted" | "interview" | "rejected"
  steps: ReferralStep[]
  createdAt: string
  updatedAt: string
}

type ReferralState = {
  opportunities: ReferralOpportunity[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): ReferralState {
  if (!input || typeof input !== "object") return { opportunities: [] }
  const payload = input as { opportunities?: unknown[] }
  if (!Array.isArray(payload.opportunities)) return { opportunities: [] }

  const opportunities = payload.opportunities
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if (
        typeof value.id !== "string" ||
        typeof value.company !== "string" ||
        typeof value.role !== "string" ||
        typeof value.contactName !== "string"
      ) {
        return null
      }

      const outcome =
        value.outcome === "intro_sent" ||
        value.outcome === "referral_submitted" ||
        value.outcome === "interview" ||
        value.outcome === "rejected"
          ? value.outcome
          : "pending"

      const steps = Array.isArray(value.steps)
        ? value.steps
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (typeof row.id !== "string" || typeof row.label !== "string") return null
              return {
                id: row.id,
                label: row.label,
                dueAt: safeIso(typeof row.dueAt === "string" ? row.dueAt : null),
                done: Boolean(row.done),
              } satisfies ReferralStep
            })
            .filter((entry): entry is ReferralStep => Boolean(entry))
            .slice(0, 12)
        : []

      return {
        id: value.id,
        company: value.company,
        role: value.role,
        contactName: value.contactName,
        warmPath: typeof value.warmPath === "string" ? value.warmPath : null,
        introScore: Math.max(1, Math.min(100, Math.round(Number(value.introScore || 60)))),
        outcome,
        steps,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
      } satisfies ReferralOpportunity
    })
    .filter((item): item is ReferralOpportunity => Boolean(item))
    .slice(-200)

  return { opportunities }
}

function defaultSteps() {
  return [
    { id: generateId("step"), label: "Send warm intro request", dueAt: null, done: false },
    { id: generateId("step"), label: "Share role context + achievements", dueAt: null, done: false },
    { id: generateId("step"), label: "Follow up in 72 hours", dueAt: null, done: false },
  ] satisfies ReferralStep[]
}

function summarize(state: ReferralState) {
  const total = state.opportunities.length
  const introSent = state.opportunities.filter((item) => item.outcome === "intro_sent").length
  const referralSubmitted = state.opportunities.filter((item) => item.outcome === "referral_submitted").length
  const interviews = state.opportunities.filter((item) => item.outcome === "interview").length
  return {
    total,
    introSent,
    referralSubmitted,
    interviews,
    introRate: total > 0 ? Math.round((introSent / total) * 100) : 0,
    referralRate: total > 0 ? Math.round((referralSubmitted / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<ReferralState>(supabase, userId, STORAGE_KEY, { opportunities: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`referral-pipeline:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const opportunities = module.state.opportunities
      .slice()
      .sort((a, b) => b.introScore - a.introScore || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

    return ok({ success: true, summary: summarize(module.state), opportunities })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load referral pipeline"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`referral-pipeline:post:${getClientIp(request)}`, 80, 60_000)
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

    if (body.action === "addOpportunity") {
      const payload = body.payload
      const steps = payload.steps && payload.steps.length > 0
        ? payload.steps.map((step) => ({
            id: generateId("step"),
            label: step.label,
            dueAt: safeIso(step.dueAt) || null,
            done: false,
          }))
        : defaultSteps()

      const item: ReferralOpportunity = {
        id: generateId("referral"),
        company: payload.company,
        role: payload.role,
        contactName: payload.contactName,
        warmPath: payload.warmPath || null,
        introScore: payload.introScore,
        outcome: "pending",
        steps,
        createdAt: now,
        updatedAt: now,
      }
      nextState = { opportunities: [...state.opportunities, item].slice(-200) }
    }

    if (body.action === "advanceStep") {
      nextState = {
        opportunities: state.opportunities.map((item) =>
          item.id === body.payload.opportunityId
            ? {
                ...item,
                updatedAt: now,
                steps: item.steps.map((step) =>
                  step.id === body.payload.stepId
                    ? { ...step, done: body.payload.done }
                    : step
                ),
              }
            : item
        ),
      }
    }

    if (body.action === "setOutcome") {
      nextState = {
        opportunities: state.opportunities.map((item) =>
          item.id === body.payload.opportunityId
            ? { ...item, outcome: body.payload.outcome, updatedAt: now }
            : item
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      success: true,
      summary: summarize(nextState),
      opportunities: nextState.opportunities,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update referral pipeline"
    return fail(message, 500)
  }
}
