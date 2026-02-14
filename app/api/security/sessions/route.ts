import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function hashSessionCookie(value: string | undefined): string {
  if (!value) return "session-unknown"
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `session-${Math.abs(hash)}`
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`security-sessions:get:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const currentKey = hashSessionCookie(request.cookies.get("sb-access-token")?.value)
    await supabase.from("user_sessions").upsert(
      {
        user_id: user.id,
        session_key: currentKey,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent"),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,session_key" }
    )

    const sessions = await supabase
      .from("user_sessions")
      .select("id, session_key, ip_address, user_agent, last_seen_at, revoked_at, created_at")
      .eq("user_id", user.id)
      .order("last_seen_at", { ascending: false })
      .limit(20)

    if (sessions.error) throw sessions.error

    const normalized = (sessions.data || []).map((session: any) => ({
      ...session,
      isCurrent: session.session_key === currentKey,
    }))

    return ok({ success: true, sessions: normalized, currentSessionKey: currentKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions"
    return fail(message, 500)
  }
}
