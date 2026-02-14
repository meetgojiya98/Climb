import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import {
  ENTERPRISE_FEATURE_CATALOG,
  buildDefaultRollout,
  isEnterpriseFeatureId,
  summarizeFeatureSuite,
  type EnterpriseFeatureStatus,
} from "@/lib/enterprise-feature-suite"
import {
  loadEnterpriseFeaturesForUser,
  upsertEnterpriseRollouts,
  writeEnterpriseRun,
  type EnterpriseRolloutUpdate,
} from "@/lib/enterprise-feature-store"
import { writeAuditEvent } from "@/lib/platform-events"

const STATUS_VALUES = ["backlog", "planned", "in_progress", "live"] as const
const StatusSchema = z.enum(STATUS_VALUES)

const UpdateSchema = z.object({
  featureId: z.string().min(3).max(120),
  status: StatusSchema.default("live"),
  priority: z.number().min(0).max(100).default(85),
  owner: z.string().min(2).max(100).default("AI Program Owner"),
  notes: z.string().max(500).default(""),
})

const UpdatePayloadSchema = z.object({
  activateAll: z.boolean().optional().default(false),
  status: StatusSchema.optional(),
  updates: z.array(UpdateSchema).max(120).optional().default([]),
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

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`enterprise-features:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const featureState = await loadEnterpriseFeaturesForUser(supabase, user.id)
    return ok({
      success: true,
      features: featureState.features,
      summary: featureState.summary,
      persistenceEnabled: featureState.persistenceEnabled,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load enterprise features"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`enterprise-features:post:${getClientIp(request)}`, 30, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, UpdatePayloadSchema)

    const updatesMap = new Map<string, EnterpriseRolloutUpdate>()

    if (body.activateAll) {
      const targetStatus = (body.status || "live") as EnterpriseFeatureStatus
      for (const feature of ENTERPRISE_FEATURE_CATALOG) {
        const fallback = buildDefaultRollout(feature.id)
        updatesMap.set(feature.id, {
          featureId: feature.id,
          status: targetStatus,
          priority: 90,
          owner: fallback.owner,
          notes: "Activated from bulk enterprise rollout.",
        })
      }
    }

    for (const item of body.updates || []) {
      if (!isEnterpriseFeatureId(item.featureId)) continue
      updatesMap.set(item.featureId, {
        featureId: item.featureId,
        status: item.status as EnterpriseFeatureStatus,
        priority: item.priority,
        owner: item.owner,
        notes: item.notes,
      })
    }

    const updates = Array.from(updatesMap.values())
    if (updates.length === 0) return fail("No valid feature updates provided", 400)

    const upsertResult = await upsertEnterpriseRollouts(supabase, user.id, updates)

    const [runWriteResult, auditWriteResult] = await Promise.allSettled([
      writeEnterpriseRun(supabase, {
        userId: user.id,
        featureId: null,
        runKind: body.activateAll ? "activation" : "analysis",
        body: {
          applied: upsertResult.applied,
          activateAll: body.activateAll,
          status: body.status || null,
        },
      }),
      writeAuditEvent(supabase, {
        userId: user.id,
        eventType: body.activateAll ? "enterprise.features.activate_all" : "enterprise.features.updated",
        metadata: {
          applied: upsertResult.applied,
          featureIds: updates.map((item) => item.featureId),
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      }),
    ])

    if (runWriteResult.status === "rejected") {
      console.warn("[enterprise/features] run log write skipped:", getErrorMessage(runWriteResult.reason, "Unknown run logging error"))
    }
    if (auditWriteResult.status === "rejected") {
      console.warn("[enterprise/features] audit log write skipped:", getErrorMessage(auditWriteResult.reason, "Unknown audit logging error"))
    }

    const featureState = await loadEnterpriseFeaturesForUser(supabase, user.id)
    const mergedFeatures = !upsertResult.persistenceEnabled
      ? featureState.features.map((feature) => {
          const localUpdate = updates.find((item) => item.featureId === feature.id)
          if (!localUpdate) return feature
          return {
            ...feature,
            status: localUpdate.status,
            priority: localUpdate.priority,
            owner: localUpdate.owner,
            notes: localUpdate.notes,
            updatedAt: new Date().toISOString(),
          }
        })
      : featureState.features
    return ok({
      success: true,
      applied: upsertResult.applied,
      persistenceEnabled: upsertResult.persistenceEnabled,
      features: mergedFeatures,
      summary: summarizeFeatureSuite(mergedFeatures),
    })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = getErrorMessage(error, "Failed to update enterprise feature suite")
    return fail(message, 500)
  }
}
