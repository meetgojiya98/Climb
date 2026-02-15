import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "automation-rules"

const RuleSchema = z.object({
  name: z.string().min(2).max(120),
  enabled: z.boolean().default(true),
  condition: z.enum(["stale_days_gt", "status_is", "match_score_lt"]),
  threshold: z.number().min(0).max(365).optional(),
  statusValue: z.string().max(60).optional(),
  action: z.enum(["set_followup_tomorrow", "set_status_screening", "flag_attention"]),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), payload: RuleSchema }),
  z.object({
    action: z.literal("update"),
    payload: z.object({
      ruleId: z.string().min(1),
      patch: RuleSchema.partial(),
    }),
  }),
  z.object({ action: z.literal("delete"), payload: z.object({ ruleId: z.string().min(1) }) }),
])

type AutomationRule = z.infer<typeof RuleSchema> & {
  id: string
  createdAt: string
  updatedAt: string
}

type AutomationState = {
  rules: AutomationRule[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): AutomationState {
  if (!input || typeof input !== "object") return { rules: [] }
  const payload = input as { rules?: unknown[] }
  if (!Array.isArray(payload.rules)) return { rules: [] }

  const rules = payload.rules
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      const parsed = RuleSchema.safeParse({
        name: value.name,
        enabled: value.enabled,
        condition: value.condition,
        threshold: value.threshold,
        statusValue: value.statusValue,
        action: value.action,
      })
      if (!parsed.success || typeof value.id !== "string") return null
      return {
        id: value.id,
        ...parsed.data,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
      } satisfies AutomationRule
    })
    .filter((item): item is AutomationRule => Boolean(item))
    .slice(-80)

  return { rules }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<AutomationState>(supabase, userId, STORAGE_KEY, { rules: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`automation-rules:get:${getClientIp(request)}`, 120, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await readState(supabase, user.id)
    return ok({ success: true, rules: state.rules })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load automation rules"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`automation-rules:post:${getClientIp(request)}`, 80, 60_000)
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

    if (body.action === "create") {
      nextState = {
        rules: [
          ...state.rules,
          {
            id: generateId("rule"),
            ...body.payload,
            createdAt: now,
            updatedAt: now,
          },
        ].slice(-80),
      }
    }

    if (body.action === "update") {
      nextState = {
        rules: state.rules.map((rule) =>
          rule.id === body.payload.ruleId
            ? {
                ...rule,
                ...body.payload.patch,
                updatedAt: now,
              }
            : rule
        ),
      }
    }

    if (body.action === "delete") {
      nextState = {
        rules: state.rules.filter((rule) => rule.id !== body.payload.ruleId),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({ success: true, rules: nextState.rules })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update automation rules"
    return fail(message, 500)
  }
}
