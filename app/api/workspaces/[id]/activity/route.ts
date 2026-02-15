import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { getWorkspaceRole } from "@/lib/workspaces"

function isMissingRelationError(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes("does not exist") ||
    text.includes("relation") ||
    text.includes("column") ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("not found in the schema cache")
  )
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const rate = checkRateLimit(`workspace-activity:get:${getClientIp(request)}`, 90, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const workspaceId = context.params.id
    const role = await getWorkspaceRole(supabase, workspaceId, user.id)
    if (!role) return fail("Workspace not found", 404)

    const events = await supabase
      .from("workspace_activity_events")
      .select("id, event_type, entity_type, entity_id, payload, actor_user_id, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (events.error) {
      if (isMissingRelationError(String(events.error.message || ""))) {
        return ok({ success: true, events: [] })
      }
      throw events.error
    }
    return ok({ success: true, events: events.data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workspace activity"
    return fail(message, 500)
  }
}
