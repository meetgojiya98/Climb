import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { getWorkspaceRole } from "@/lib/workspaces"
import { writeWorkspaceActivity } from "@/lib/platform-events"

const CreateCommentSchema = z.object({
  workspaceId: z.string().uuid(),
  module: z.string().min(2).max(64),
  entityId: z.string().max(120).optional(),
  content: z.string().min(2).max(2000),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`comments:get:${getClientIp(request)}`, 120, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")
    const module = request.nextUrl.searchParams.get("module")
    if (!workspaceId) return fail("workspaceId is required", 400)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const role = await getWorkspaceRole(supabase, workspaceId, user.id)
    if (!role) return fail("Workspace not found", 404)

    let query = supabase
      .from("workspace_comments")
      .select("id, workspace_id, user_id, module, entity_id, content, resolved, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (module) query = query.eq("module", module)

    const result = await query
    if (result.error) throw result.error

    return ok({ success: true, comments: result.data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`comments:post:${getClientIp(request)}`, 40, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, CreateCommentSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const role = await getWorkspaceRole(supabase, body.workspaceId, user.id)
    if (!role) return fail("Workspace not found", 404)

    const created = await supabase
      .from("workspace_comments")
      .insert({
        workspace_id: body.workspaceId,
        user_id: user.id,
        module: body.module,
        entity_id: body.entityId || null,
        content: body.content.trim(),
      })
      .select("id, workspace_id, user_id, module, entity_id, content, resolved, created_at, updated_at")
      .single()

    if (created.error) throw created.error

    await writeWorkspaceActivity(supabase, {
      workspaceId: body.workspaceId,
      actorUserId: user.id,
      eventType: "workspace.comment_created",
      entityType: "comment",
      entityId: created.data.id,
      payload: {
        module: body.module,
        entityId: body.entityId || null,
      },
    })

    return ok({ success: true, comment: created.data }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to create comment"
    return fail(message, 500)
  }
}
