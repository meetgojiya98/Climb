import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { writeAuditEvent } from "@/lib/platform-events"

const EXPORT_TABLES = [
  "profiles",
  "resumes",
  "applications",
  "career_goals",
  "roles",
  "saved_jobs",
  "cover_letters",
  "interview_sessions",
  "notifications",
  "workspace_members",
  "workspace_comments",
  "workspace_activity_events",
  "audit_events",
] as const

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`security-export:get:${getClientIp(request)}`, 8, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const exportRequest = await supabase
      .from("data_export_requests")
      .insert({ user_id: user.id, status: "processing", format: "json" })
      .select("id")
      .maybeSingle()

    const snapshot: Record<string, any[]> = {}
    for (const table of EXPORT_TABLES) {
      const query = await supabase.from(table).select("*").eq("user_id", user.id)
      if (!query.error && Array.isArray(query.data)) {
        snapshot[table] = query.data
      }
    }

    if (exportRequest.data?.id) {
      await supabase
        .from("data_export_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", exportRequest.data.id)
        .eq("user_id", user.id)
    }

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "security.data_export_requested",
      metadata: {
        tables: Object.keys(snapshot),
        exportRequestId: exportRequest.data?.id || null,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({
      success: true,
      exportedAt: new Date().toISOString(),
      tables: Object.keys(snapshot),
      data: snapshot,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export data"
    return fail(message, 500)
  }
}
