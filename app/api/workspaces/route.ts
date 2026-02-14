import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { buildWorkspaceSlug, ensureDefaultWorkspace, listUserWorkspaces } from "@/lib/workspaces"
import { writeAuditEvent, writeWorkspaceActivity } from "@/lib/platform-events"

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(90),
  description: z.string().max(240).optional(),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`workspaces:get:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    await ensureDefaultWorkspace(supabase, user.id)
    const workspaces = await listUserWorkspaces(supabase, user.id)
    return ok({ success: true, workspaces })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workspaces"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`workspaces:post:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, CreateWorkspaceSchema)
    const slug = buildWorkspaceSlug(body.name) || `workspace-${Date.now()}`

    const created = await supabase
      .from("workspaces")
      .insert({
        owner_user_id: user.id,
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
      })
      .select("id, owner_user_id, name, slug, description, is_default, created_at, updated_at")
      .single()

    if (created.error) throw created.error

    await supabase.from("workspace_members").upsert({
      workspace_id: created.data.id,
      user_id: user.id,
      role: "owner",
      invited_by: user.id,
    })

    await writeAuditEvent(supabase, {
      userId: user.id,
      workspaceId: created.data.id,
      eventType: "workspace.created",
      metadata: { name: created.data.name, slug: created.data.slug },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    await writeWorkspaceActivity(supabase, {
      workspaceId: created.data.id,
      actorUserId: user.id,
      eventType: "workspace.created",
      entityType: "workspace",
      entityId: created.data.id,
      payload: { name: created.data.name },
    })

    return ok({ success: true, workspace: created.data }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContractError) return fail(error.message, error.status)
    const message = error instanceof Error ? error.message : "Failed to create workspace"
    return fail(message, 500)
  }
}
