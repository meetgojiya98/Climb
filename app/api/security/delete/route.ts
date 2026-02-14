import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { writeAuditEvent } from "@/lib/platform-events"

const DeleteSchema = z.object({
  confirmation: z.literal("DELETE_MY_DATA"),
  reason: z.string().max(300).optional(),
})

const USER_ID_TABLES = [
  "notifications",
  "interview_sessions",
  "saved_jobs",
  "cover_letters",
  "career_goals",
  "applications",
  "resumes",
  "roles",
  "workspace_comments",
  "workspace_activity_events",
  "workspace_members",
  "audit_events",
  "security_anomalies",
  "user_sessions",
  "data_export_requests",
] as const

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`security-delete:post:${getClientIp(request)}`, 5, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, DeleteSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const deletionRequest = await supabase
      .from("data_deletion_requests")
      .insert({
        user_id: user.id,
        status: "processing",
        reason: body.reason || null,
        scheduled_for: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle()

    for (const table of USER_ID_TABLES) {
      await supabase.from(table).delete().eq("user_id", user.id)
    }
    await supabase.from("workspaces").delete().eq("owner_user_id", user.id)
    await supabase.from("profiles").delete().eq("user_id", user.id)
    await supabase.from("profiles").delete().eq("id", user.id)

    if (deletionRequest.data?.id) {
      await supabase
        .from("data_deletion_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", deletionRequest.data.id)
        .eq("user_id", user.id)
    }

    await writeAuditEvent(supabase, {
      userId: user.id,
      eventType: "security.data_deleted",
      severity: "warning",
      metadata: {
        reason: body.reason || null,
        deletionRequestId: deletionRequest.data?.id || null,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return ok({
      success: true,
      deletedAt: new Date().toISOString(),
      deletionRequestId: deletionRequest.data?.id || null,
    })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to delete data"
    return fail(message, 500)
  }
}
