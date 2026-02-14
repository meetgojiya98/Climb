import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { getEnterpriseFeatureById } from "@/lib/enterprise-feature-suite"
import { listEnterpriseRunsForFeature } from "@/lib/enterprise-feature-store"

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest, context: { params: { featureId: string } }) {
  const rate = checkRateLimit(`enterprise-feature-runs:get:${getClientIp(request)}`, 60, 60_000)
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

    const limitRaw = request.nextUrl.searchParams.get("limit")
    const limit = Number(limitRaw || 15)
    const runHistory = await listEnterpriseRunsForFeature(supabase, {
      userId: user.id,
      featureId,
      limit: Number.isFinite(limit) ? limit : 15,
    })

    return ok({
      success: true,
      featureId,
      runs: runHistory.runs,
      persistenceEnabled: runHistory.persistenceEnabled,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feature run history"
    return fail(message, 500)
  }
}
