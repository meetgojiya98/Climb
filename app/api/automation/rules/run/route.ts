import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { loadModuleState } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "automation-rules"

type AutomationRule = {
  id: string
  name: string
  enabled: boolean
  condition: "stale_days_gt" | "status_is" | "match_score_lt"
  threshold?: number
  statusValue?: string
  action: "set_followup_tomorrow" | "set_status_screening" | "flag_attention"
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

  const rules = payload.rules.reduce<AutomationRule[]>((acc, item) => {
      if (!item || typeof item !== "object") return acc
      const value = item as Record<string, unknown>
      if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.action !== "string" || typeof value.condition !== "string") {
        return acc
      }
      const condition = value.condition
      const action = value.action
      if (
        (condition !== "stale_days_gt" && condition !== "status_is" && condition !== "match_score_lt") ||
        (action !== "set_followup_tomorrow" && action !== "set_status_screening" && action !== "flag_attention")
      ) {
        return acc
      }
      acc.push({
        id: value.id,
        name: value.name,
        enabled: value.enabled !== false,
        condition,
        threshold: Number(value.threshold ?? 0),
        statusValue: typeof value.statusValue === "string" ? value.statusValue : undefined,
        action,
        createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
      })
      return acc
    }, [])

  return { rules }
}

async function updateApplicationSafely(supabase: any, applicationId: string, patch: Record<string, unknown>) {
  let workingPatch = { ...patch }
  let result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  if (!result.error) return { ok: true as const }

  const message = String(result.error.message || "").toLowerCase()
  if (message.includes("follow_up_date")) {
    const { follow_up_date, ...rest } = workingPatch as Record<string, unknown>
    workingPatch = rest
    result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  }

  if (result.error) {
    const nextMessage = String(result.error.message || "").toLowerCase()
    if (nextMessage.includes("next_action_at")) {
      const { next_action_at, ...rest } = workingPatch as Record<string, unknown>
      workingPatch = rest
      result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
    }
  }

  if (result.error) return { ok: false as const, error: String(result.error.message || "Update failed") }
  return { ok: true as const }
}

function matchesRule(rule: AutomationRule, item: {
  status: string | null
  created_at: string | null
  applied_date: string | null
  match_score: number | null
}) {
  if (rule.condition === "stale_days_gt") {
    const threshold = Number(rule.threshold || 7)
    const ts = Date.parse(item.created_at || item.applied_date || "")
    if (!Number.isFinite(ts)) return false
    const staleDays = (Date.now() - ts) / (24 * 60 * 60 * 1000)
    return staleDays > threshold
  }

  if (rule.condition === "status_is") {
    const current = String(item.status || "").toLowerCase()
    return current === String(rule.statusValue || "").toLowerCase()
  }

  const score = Number(item.match_score)
  const threshold = Number(rule.threshold || 50)
  return Number.isFinite(score) && score < threshold
}

function patchForRule(rule: AutomationRule) {
  if (rule.action === "set_followup_tomorrow") {
    return {
      follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      next_action_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    }
  }
  if (rule.action === "set_status_screening") {
    return { status: "screening" }
  }
  return {
    notes: "[automation-flag] Attention required based on rules engine",
    next_action_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`automation-rules-run:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const ruleState = await loadModuleState<AutomationState>(
      supabase,
      user.id,
      STORAGE_KEY,
      { rules: [] },
      sanitizeState
    )

    const enabledRules = ruleState.state.rules.filter((rule) => rule.enabled)
    if (enabledRules.length === 0) {
      return ok({ success: true, message: "No enabled rules", results: [] as unknown[] })
    }

    const applications = await fetchApplicationsCompatible(supabase, user.id)
    const results: Array<{
      ruleId: string
      ruleName: string
      matched: number
      updated: number
      errors: number
    }> = []

    for (const rule of enabledRules) {
      const matchedItems = applications.filter((item) => matchesRule(rule, item))
      let updated = 0
      let errors = 0
      for (const application of matchedItems) {
        const persisted = await updateApplicationSafely(supabase, application.id, patchForRule(rule))
        if (!persisted.ok) {
          errors += 1
          continue
        }
        updated += 1
      }
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: matchedItems.length,
        updated,
        errors,
      })
    }

    return ok({
      success: true,
      totalRules: enabledRules.length,
      totalApplications: applications.length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run automation rules"
    return fail(message, 500)
  }
}
