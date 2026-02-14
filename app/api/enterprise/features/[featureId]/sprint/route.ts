import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { getEnterpriseFeatureById } from "@/lib/enterprise-feature-suite"
import {
  loadEnterpriseFeaturesForUser,
  upsertEnterpriseRollouts,
  writeEnterpriseRun,
} from "@/lib/enterprise-feature-store"
import { buildFeatureSprintPlan } from "@/lib/enterprise-feature-engine"
import { writeAuditEvent } from "@/lib/platform-events"

const SprintSchema = z.object({
  notes: z.string().max(500).optional(),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function POST(request: NextRequest, context: { params: { featureId: string } }) {
  const rate = checkRateLimit(`enterprise-sprint:post:${getClientIp(request)}`, 30, 60_000)
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

    const body = await parseJsonBody(request, SprintSchema)
    const sprintPlan = buildFeatureSprintPlan(feature, body.notes)
    const runAt = new Date().toISOString()

    const featureState = await loadEnterpriseFeaturesForUser(supabase, user.id)
    const existing = featureState.features.find((item) => item.id === featureId)

    await upsertEnterpriseRollouts(supabase, user.id, [
      {
        featureId,
        status: existing?.status === "live" ? "live" : "in_progress",
        priority: existing?.priority ?? 88,
        owner: existing?.owner || "AI Program Owner",
        notes: body.notes || existing?.notes || "Sprint generated and scheduled.",
        lastRunAt: runAt,
      },
    ])

    await writeEnterpriseRun(supabase, {
      userId: user.id,
      featureId,
      runKind: "sprint",
      body: {
        generatedAt: runAt,
        notes: body.notes || null,
        sprintDays: sprintPlan.sprintDays,
      },
    })

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "enterprise.feature.sprint_generated",
      metadata: {
        featureId,
        featureTitle: feature.title,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({ success: true, sprint: sprintPlan, generatedAt: runAt })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to generate feature sprint"
    return fail(message, 500)
  }
}
