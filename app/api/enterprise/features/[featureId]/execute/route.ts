import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { buildDefaultRollout, getEnterpriseFeatureById } from "@/lib/enterprise-feature-suite"
import {
  loadEnterpriseFeaturesForUser,
  upsertEnterpriseRollouts,
  writeEnterpriseRun,
} from "@/lib/enterprise-feature-store"
import {
  buildFeatureExecutionPackage,
  createExecutionReminders,
  loadEnterpriseRuntimeSignals,
  type ExecutionFocus,
} from "@/lib/enterprise-feature-runtime"
import { writeAuditEvent } from "@/lib/platform-events"

const ExecuteFeatureSchema = z.object({
  notes: z.string().max(1200).optional(),
  focus: z.enum(["speed", "quality", "conversion", "risk"]).optional().default("conversion"),
  createReminders: z.boolean().optional().default(true),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

export async function POST(request: NextRequest, context: { params: { featureId: string } }) {
  const rate = checkRateLimit(`enterprise-feature-execute:post:${getClientIp(request)}`, 24, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const featureId = context.params.featureId
    const feature = getEnterpriseFeatureById(featureId)
    if (!feature) return fail("Feature not found", 404)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, ExecuteFeatureSchema)
    const [featureState, signals] = await Promise.all([
      loadEnterpriseFeaturesForUser(supabase, user.id),
      loadEnterpriseRuntimeSignals(supabase, user.id),
    ])

    const existingRollout = featureState.features.find((item) => item.id === featureId)
    const fallback = buildDefaultRollout(featureId)
    const rollout = {
      ...(existingRollout || feature),
      featureId,
      status: existingRollout?.status || fallback.status,
      priority: existingRollout?.priority ?? fallback.priority,
      owner: existingRollout?.owner || fallback.owner,
      notes: existingRollout?.notes || fallback.notes,
      lastRunAt: existingRollout?.lastRunAt || fallback.lastRunAt,
      updatedAt: existingRollout?.updatedAt || fallback.updatedAt,
    }

    const execution = buildFeatureExecutionPackage({
      feature,
      rollout,
      signals,
      focus: body.focus as ExecutionFocus,
      notes: body.notes,
    })

    const generatedAt = execution.generatedAt || new Date().toISOString()

    await upsertEnterpriseRollouts(supabase, user.id, [
      {
        featureId,
        status: rollout.status === "live" ? "live" : "in_progress",
        priority: Math.max(rollout.priority || 0, 80),
        owner: rollout.owner || fallback.owner,
        notes: body.notes || rollout.notes || "Execution package generated from feature runtime.",
        lastRunAt: generatedAt,
      },
    ])

    const sideEffects = await Promise.allSettled([
      writeEnterpriseRun(supabase, {
        userId: user.id,
        featureId,
        runKind: "analysis",
        body: {
          kind: "feature_execution",
          focus: body.focus,
          generatedAt,
          execution,
          signalSummary: {
            momentumScore: signals.momentumScore,
            openApplications: signals.applications.open,
            staleApplications: signals.applications.stale,
            resumes: signals.resumes.total,
            goals: signals.goals.total,
          },
        },
      }),
      writeAuditEvent(supabase, {
        userId: user.id,
        eventType: "enterprise.feature.executed",
        metadata: {
          featureId,
          featureTitle: feature.title,
          focus: body.focus,
          valueScore: execution.valueScore,
          riskLevel: execution.riskLevel,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      }),
      body.createReminders
        ? createExecutionReminders({
            supabase,
            userId: user.id,
            feature,
            execution,
          })
        : Promise.resolve({ created: 0, persistenceEnabled: true }),
    ])

    if (sideEffects[0].status === "rejected") {
      console.warn("[enterprise/features/execute] run write skipped:", getErrorMessage(sideEffects[0].reason, "unknown"))
    }
    if (sideEffects[1].status === "rejected") {
      console.warn("[enterprise/features/execute] audit write skipped:", getErrorMessage(sideEffects[1].reason, "unknown"))
    }
    if (sideEffects[2].status === "rejected") {
      console.warn("[enterprise/features/execute] reminder write skipped:", getErrorMessage(sideEffects[2].reason, "unknown"))
    }

    return ok({
      success: true,
      featureId,
      execution,
      generatedAt,
    })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    return fail(getErrorMessage(error, "Failed to execute enterprise feature"), 500)
  }
}
