function isMissingRelationError(message: string): boolean {
  const text = message.toLowerCase()
  return text.includes("does not exist") || text.includes("relation") || text.includes("column")
}

export async function listUserWorkspaces(supabase: any, userId: string) {
  const memberships = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)

  if (memberships.error && !isMissingRelationError(String(memberships.error.message || ""))) {
    throw memberships.error
  }

  const workspaceIds = Array.isArray(memberships.data)
    ? memberships.data.map((row: any) => row.workspace_id).filter(Boolean)
    : []

  const owned = await supabase
    .from("workspaces")
    .select("id, owner_user_id, name, slug, description, is_default, created_at, updated_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })

  if (owned.error && !isMissingRelationError(String(owned.error.message || ""))) {
    throw owned.error
  }

  const memberOnly = workspaceIds.length
    ? await supabase
        .from("workspaces")
        .select("id, owner_user_id, name, slug, description, is_default, created_at, updated_at")
        .in("id", workspaceIds)
    : { data: [], error: null }

  if (memberOnly.error && !isMissingRelationError(String(memberOnly.error.message || ""))) {
    throw memberOnly.error
  }

  const merged = [...(owned.data || []), ...(memberOnly.data || [])]
  const dedup = new Map<string, any>()
  for (const row of merged) dedup.set(row.id, row)

  return Array.from(dedup.values())
}

export async function ensureDefaultWorkspace(supabase: any, userId: string) {
  const existing = await listUserWorkspaces(supabase, userId)
  if (existing.length > 0) return existing[0]

  const created = await supabase
    .from("workspaces")
    .insert({
      owner_user_id: userId,
      name: "Personal Workspace",
      slug: "personal",
      description: "Default workspace",
      is_default: true,
    })
    .select("id, owner_user_id, name, slug, description, is_default, created_at, updated_at")
    .single()

  if (created.error) {
    if (isMissingRelationError(String(created.error.message || ""))) {
      return {
        id: "fallback-personal-workspace",
        owner_user_id: userId,
        name: "Personal Workspace",
        slug: "personal",
        description: "Fallback local workspace",
        is_default: true,
      }
    }
    throw created.error
  }

  await supabase.from("workspace_members").upsert({
    workspace_id: created.data.id,
    user_id: userId,
    role: "owner",
  })

  return created.data
}

export async function getWorkspaceRole(supabase: any, workspaceId: string, userId: string) {
  const owned = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_user_id", userId)
    .maybeSingle()

  if (owned.data?.id) return "owner"

  const member = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (member.error && !isMissingRelationError(String(member.error.message || ""))) {
    throw member.error
  }
  return member.data?.role || null
}

export function buildWorkspaceSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
}
