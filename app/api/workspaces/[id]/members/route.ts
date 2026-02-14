import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { getWorkspaceRole } from "@/lib/workspaces"
import { writeAuditEvent, writeWorkspaceActivity } from "@/lib/platform-events"

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const rate = checkRateLimit(`workspace-members:get:${getClientIp(request)}`, 80, 60_000)
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

    const members = await supabase
      .from("workspace_members")
      .select("id, user_id, role, invited_by, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })

    if (members.error) throw members.error
    return ok({ success: true, members: members.data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workspace members"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const rate = checkRateLimit(`workspace-members:post:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const workspaceId = context.params.id
    const role = await getWorkspaceRole(supabase, workspaceId, user.id)
    if (role !== "owner" && role !== "admin") return fail("Insufficient permissions", 403)

    const body = await parseJsonBody(request, AddMemberSchema)
    const inserted = await supabase
      .from("workspace_members")
      .upsert({
        workspace_id: workspaceId,
        user_id: body.userId,
        role: body.role,
        invited_by: user.id,
      })
      .select("id, user_id, role, invited_by, created_at")
      .single()

    if (inserted.error) throw inserted.error

    await writeAuditEvent(supabase, {
      userId: user.id,
      workspaceId,
      eventType: "workspace.member_added",
      metadata: { invitedUserId: body.userId, role: body.role },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    await writeWorkspaceActivity(supabase, {
      workspaceId,
      actorUserId: user.id,
      eventType: "workspace.member_added",
      entityType: "workspace_member",
      entityId: inserted.data.id,
      payload: { invitedUserId: body.userId, role: body.role },
    })

    return ok({ success: true, member: inserted.data }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to add workspace member"
    return fail(message, 500)
  }
}
