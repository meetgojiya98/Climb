import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { isEnterpriseFeatureId } from "@/lib/enterprise-feature-suite"
import {
  loadEnterpriseFeaturesForUser,
  upsertEnterpriseRollouts,
  writeEnterpriseRun,
} from "@/lib/enterprise-feature-store"
import { buildFeatureRoadmapPlan } from "@/lib/enterprise-feature-engine"
import { writeAuditEvent } from "@/lib/platform-events"

const RoadmapSchema = z.object({
  objective: z.string().min(10).max(600).optional(),
  horizonWeeks: z.number().min(6).max(26).optional(),
  featureIds: z.array(z.string().min(3).max(120)).max(30).optional(),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`enterprise-roadmap:post:${getClientIp(request)}`, 18, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, RoadmapSchema)
    const featureState = await loadEnterpriseFeaturesForUser(supabase, user.id)

    const scopedIds = (body.featureIds || []).filter((id) => isEnterpriseFeatureId(id))
    const scopedFeatures = scopedIds.length
      ? featureState.features.filter((feature) => scopedIds.includes(feature.id))
      : featureState.features

    const roadmap = buildFeatureRoadmapPlan({
      objective: body.objective,
      horizonWeeks: body.horizonWeeks,
      selectedFeatures: scopedFeatures,
    })

    const runAt = new Date().toISOString()
    const touchRows = scopedFeatures.map((feature) => ({
      featureId: feature.id,
      status: feature.status,
      priority: feature.priority,
      owner: feature.owner,
      notes: feature.notes,
      lastRunAt: runAt,
    }))

    if (touchRows.length > 0) {
      await upsertEnterpriseRollouts(supabase, user.id, touchRows)
    }

    await writeEnterpriseRun(supabase, {
      userId: user.id,
      featureId: null,
      runKind: "roadmap",
      body: {
        objective: roadmap.objective,
        horizonWeeks: roadmap.horizonWeeks,
        featureIds: scopedFeatures.map((feature) => feature.id),
        generatedAt: runAt,
      },
    })

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "enterprise.features.roadmap_generated",
      metadata: {
        horizonWeeks: roadmap.horizonWeeks,
        features: scopedFeatures.length,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({ success: true, roadmap, generatedAt: runAt })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to generate enterprise roadmap"
    return fail(message, 500)
  }
}
