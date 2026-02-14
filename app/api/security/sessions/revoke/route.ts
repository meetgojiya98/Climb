import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { writeAuditEvent } from "@/lib/platform-events"

const RevokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`security-session-revoke:post:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const payload = await parseJsonBody(request, RevokeSessionSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const revoked = await supabase
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", payload.sessionId)
      .eq("user_id", user.id)
      .select("id")
      .single()

    if (revoked.error) throw revoked.error

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "security.session_revoked",
      metadata: { sessionId: payload.sessionId },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({ success: true, sessionId: payload.sessionId })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to revoke session"
    return fail(message, 500)
  }
}
