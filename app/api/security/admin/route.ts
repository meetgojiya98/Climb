import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { writeAuditEvent } from "@/lib/platform-events"

const UpdateControlSchema = z.object({
  key: z.string().min(2).max(80),
  value: z.record(z.any()),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function isAdmin(email: string | null | undefined) {
  if (!email) return false
  const whitelist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return whitelist.includes(email.toLowerCase())
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`security-admin:get:${getClientIp(request)}`, 30, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)
    if (!isAdmin(user.email)) return fail("Forbidden", 403)

    const [controls, anomalies, audits] = await Promise.all([
      supabase.from("admin_controls").select("id, key, value, updated_by, updated_at").order("updated_at", { ascending: false }),
      supabase.from("security_anomalies").select("id, user_id, anomaly_type, severity, resolved, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("audit_events").select("id, user_id, event_type, severity, created_at").order("created_at", { ascending: false }).limit(100),
    ])

    if (controls.error) throw controls.error
    if (anomalies.error) throw anomalies.error
    if (audits.error) throw audits.error

    return ok({
      success: true,
      controls: controls.data || [],
      anomalies: anomalies.data || [],
      audits: audits.data || [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin controls"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`security-admin:post:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const payload = await parseJsonBody(request, UpdateControlSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)
    if (!isAdmin(user.email)) return fail("Forbidden", 403)

    const result = await supabase
      .from("admin_controls")
      .upsert(
        {
          key: payload.key,
          value: payload.value,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select("id, key, value, updated_by, updated_at")
      .single()

    if (result.error) throw result.error

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "security.admin_control_updated",
      severity: "warning",
      metadata: { key: payload.key },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({ success: true, control: result.data })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to update admin control"
    return fail(message, 500)
  }
}
