import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "ai-memory-profile"

const RequestSchema = z.object({
  goals: z.array(z.string().min(2).max(160)).max(20).optional(),
  constraints: z.array(z.string().min(2).max(160)).max(20).optional(),
  preferredStyle: z.string().min(2).max(200).optional(),
  preferredRoles: z.array(z.string().min(2).max(120)).max(20).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  weeklyAvailabilityHours: z.number().min(1).max(80).optional(),
  notes: z.string().max(1200).optional(),
})

type MemoryState = {
  goals: string[]
  constraints: string[]
  preferredStyle: string
  preferredRoles: string[]
  riskTolerance: "low" | "medium" | "high"
  weeklyAvailabilityHours: number
  notes: string
  updatedAt: string
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): MemoryState {
  if (!input || typeof input !== "object") {
    return {
      goals: [],
      constraints: [],
      preferredStyle: "Clear and practical",
      preferredRoles: [],
      riskTolerance: "medium",
      weeklyAvailabilityHours: 10,
      notes: "",
      updatedAt: new Date().toISOString(),
    }
  }
  const payload = input as Record<string, unknown>
  return {
    goals: Array.isArray(payload.goals) ? payload.goals.filter((item): item is string => typeof item === "string").slice(0, 20) : [],
    constraints: Array.isArray(payload.constraints) ? payload.constraints.filter((item): item is string => typeof item === "string").slice(0, 20) : [],
    preferredStyle: typeof payload.preferredStyle === "string" ? payload.preferredStyle : "Clear and practical",
    preferredRoles: Array.isArray(payload.preferredRoles)
      ? payload.preferredRoles.filter((item): item is string => typeof item === "string").slice(0, 20)
      : [],
    riskTolerance: payload.riskTolerance === "low" || payload.riskTolerance === "high" ? payload.riskTolerance : "medium",
    weeklyAvailabilityHours: Math.max(1, Math.min(80, Math.round(Number(payload.weeklyAvailabilityHours || 10)))),
    notes: typeof payload.notes === "string" ? payload.notes : "",
    updatedAt: safeIso(typeof payload.updatedAt === "string" ? payload.updatedAt : null) || new Date().toISOString(),
  }
}

function buildSummary(state: MemoryState) {
  const goalText = state.goals.length ? state.goals.slice(0, 3).join("; ") : "No explicit goals set"
  const constraintText = state.constraints.length ? state.constraints.slice(0, 3).join("; ") : "No explicit constraints"
  return `Goals: ${goalText}. Constraints: ${constraintText}. Style: ${state.preferredStyle}. Risk tolerance: ${state.riskTolerance}. Availability: ${state.weeklyAvailabilityHours}h/week.`
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`ai-memory:get:${getClientIp(request)}`, 120, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await loadModuleState<MemoryState>(
      supabase,
      user.id,
      STORAGE_KEY,
      {
        goals: [],
        constraints: [],
        preferredStyle: "Clear and practical",
        preferredRoles: [],
        riskTolerance: "medium",
        weeklyAvailabilityHours: 10,
        notes: "",
        updatedAt: new Date().toISOString(),
      },
      sanitizeState
    )

    return ok({ success: true, profile: module.state, summary: buildSummary(module.state) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load AI memory profile"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`ai-memory:post:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await loadModuleState<MemoryState>(
      supabase,
      user.id,
      STORAGE_KEY,
      {
        goals: [],
        constraints: [],
        preferredStyle: "Clear and practical",
        preferredRoles: [],
        riskTolerance: "medium",
        weeklyAvailabilityHours: 10,
        notes: "",
        updatedAt: new Date().toISOString(),
      },
      sanitizeState
    )

    const nextState: MemoryState = {
      goals: body.goals ?? module.state.goals,
      constraints: body.constraints ?? module.state.constraints,
      preferredStyle: body.preferredStyle ?? module.state.preferredStyle,
      preferredRoles: body.preferredRoles ?? module.state.preferredRoles,
      riskTolerance: body.riskTolerance ?? module.state.riskTolerance,
      weeklyAvailabilityHours: body.weeklyAvailabilityHours ?? module.state.weeklyAvailabilityHours,
      notes: body.notes ?? module.state.notes,
      updatedAt: new Date().toISOString(),
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({ success: true, profile: nextState, summary: buildSummary(nextState) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update AI memory profile"
    return fail(message, 500)
  }
}
