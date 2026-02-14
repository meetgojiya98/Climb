import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`security-anomalies:get:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const anomalies = await supabase
      .from("security_anomalies")
      .select("id, anomaly_type, source, severity, context, resolved, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (anomalies.error) throw anomalies.error
    return ok({ success: true, anomalies: anomalies.data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch anomalies"
    return fail(message, 500)
  }
}
