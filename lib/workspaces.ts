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

function isDuplicateConstraintError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()
  return code === "23505" || message.includes("duplicate key")
}

const WORKSPACE_SELECT_CANDIDATES = [
  "id, owner_user_id, name, slug, description, is_default, created_at, updated_at",
  "id, owner_user_id, name, slug, description, created_at, updated_at",
  "id, owner_user_id, name, slug, created_at, updated_at",
]

const FALLBACK_WORKSPACE_PREFIX = "workspace-registry::"
const FALLBACK_WORKSPACE_TEMPLATE_TYPE = "tone"

function normalizeWorkspace(row: any) {
  return {
    id: String(row?.id || ""),
    owner_user_id: String(row?.owner_user_id || ""),
    name: String(row?.name || "Workspace"),
    slug: String(row?.slug || "workspace"),
    description: row?.description ?? null,
    is_default: Boolean(row?.is_default ?? false),
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  }
}

function normalizeFallbackWorkspace(row: any, fallbackUserId?: string) {
  const content = row?.content && typeof row.content === "object" ? row.content : {}
  const storedName =
    typeof content.workspace_name === "string" && content.workspace_name.trim().length > 0
      ? content.workspace_name.trim()
      : ""
  const storedSlug =
    typeof content.workspace_slug === "string" && content.workspace_slug.trim().length > 0
      ? content.workspace_slug.trim()
      : ""
  const fallbackSlugFromName =
    typeof row?.name === "string" && row.name.startsWith(FALLBACK_WORKSPACE_PREFIX)
      ? row.name.slice(FALLBACK_WORKSPACE_PREFIX.length)
      : ""
  const name = storedName || "Workspace"
  const slug = storedSlug || fallbackSlugFromName || buildWorkspaceSlug(name) || "workspace"

  return {
    id: String(row?.id || ""),
    owner_user_id: String(row?.user_id || fallbackUserId || ""),
    name,
    slug,
    description:
      typeof content.workspace_description === "string" ? content.workspace_description : null,
    is_default: Boolean(content.workspace_is_default ?? false),
    created_at: row?.created_at || null,
    updated_at: row?.created_at || null,
  }
}

async function listFallbackWorkspaces(supabase: any, userId: string) {
  const fallback = await supabase
    .from("template_library")
    .select("id, user_id, name, content, created_at")
    .eq("user_id", userId)
    .eq("type", FALLBACK_WORKSPACE_TEMPLATE_TYPE)
    .like("name", `${FALLBACK_WORKSPACE_PREFIX}%`)
    .order("created_at", { ascending: true })

  if (fallback.error) {
    if (isMissingRelationError(String(fallback.error.message || ""))) return []
    throw fallback.error
  }

  return Array.isArray(fallback.data)
    ? fallback.data
        .map((row: any) => normalizeFallbackWorkspace(row, userId))
        .filter((row: any) => row.id && row.owner_user_id)
    : []
}

async function getFallbackWorkspaceById(supabase: any, workspaceId: string, userId: string) {
  const fallback = await supabase
    .from("template_library")
    .select("id, user_id, name, content, created_at")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .eq("type", FALLBACK_WORKSPACE_TEMPLATE_TYPE)
    .like("name", `${FALLBACK_WORKSPACE_PREFIX}%`)
    .maybeSingle()

  if (fallback.error) {
    if (isMissingRelationError(String(fallback.error.message || ""))) return null
    throw fallback.error
  }

  if (!fallback.data) return null
  return normalizeFallbackWorkspace(fallback.data, userId)
}

async function createFallbackWorkspace(
  supabase: any,
  input: {
    userId: string
    name: string
    slugBase: string
    description?: string | null
    isDefault?: boolean
  }
) {
  const name = input.name.trim()
  const baseSlug = (input.slugBase || "workspace").slice(0, 42)
  const maxAttempts = 8
  const existing = await listFallbackWorkspaces(supabase, input.userId)
  const existingSlugs = new Set(existing.map((item: { slug: string }) => item.slug))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`
    const slug = `${baseSlug.slice(0, Math.max(1, 42 - suffix.length))}${suffix}`
    if (existingSlugs.has(slug)) continue

    const created = await supabase
      .from("template_library")
      .insert({
        user_id: input.userId,
        type: FALLBACK_WORKSPACE_TEMPLATE_TYPE,
        name: `${FALLBACK_WORKSPACE_PREFIX}${slug}`,
        content: {
          workspace_name: name,
          workspace_slug: slug,
          workspace_description: input.description?.trim() || null,
          workspace_is_default: Boolean(input.isDefault),
          workspace_fallback: true,
        },
      })
      .select("id, user_id, name, content, created_at")
      .single()

    if (!created.error) {
      return normalizeFallbackWorkspace(created.data, input.userId)
    }

    if (isDuplicateConstraintError(created.error)) continue

    if (!isMissingRelationError(String(created.error.message || ""))) {
      throw created.error
    }
  }

  throw new Error("Unable to create workspace in this environment.")
}

async function selectWorkspacesWithFallback(
  runner: (columns: string) => Promise<{ data: any; error: any }>
) {
  for (const columns of WORKSPACE_SELECT_CANDIDATES) {
    const result = await runner(columns)
    if (!result.error) {
      return { data: Array.isArray(result.data) ? result.data.map(normalizeWorkspace) : [] }
    }
    if (!isMissingRelationError(String(result.error.message || ""))) {
      return { error: result.error as any }
    }
  }
  return { data: [] as any[] }
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

  const owned = await selectWorkspacesWithFallback((columns) =>
    supabase
      .from("workspaces")
      .select(columns)
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
  )
  if ("error" in owned && owned.error) throw owned.error

  const memberOnly = workspaceIds.length
    ? await selectWorkspacesWithFallback((columns) =>
        supabase
          .from("workspaces")
          .select(columns)
          .in("id", workspaceIds)
      )
    : { data: [] as any[] }
  if ("error" in memberOnly && memberOnly.error) throw memberOnly.error

  const fallback = await listFallbackWorkspaces(supabase, userId)

  const merged = [...(owned.data || []), ...(memberOnly.data || []), ...fallback]
  const dedup = new Map<string, any>()
  for (const row of merged) dedup.set(row.id, row)

  return Array.from(dedup.values())
}

export async function ensureDefaultWorkspace(supabase: any, userId: string) {
  const existing = await listUserWorkspaces(supabase, userId)
  if (existing.length > 0) {
    const defaultWorkspace = existing.find((workspace: { is_default?: boolean }) => workspace.is_default)
    return defaultWorkspace || existing[0]
  }

  try {
    const created = await createWorkspaceCompatible(supabase, {
      userId,
      name: "Personal Workspace",
      slugBase: "personal",
      description: "Default workspace",
      isDefault: true,
    })

    // is_default is optional in older schemas; treat update failure as non-blocking when missing.
    const markedDefault = await supabase
      .from("workspaces")
      .update({ is_default: true })
      .eq("id", created.id)
      .eq("owner_user_id", userId)

    if (markedDefault.error && !isMissingRelationError(String(markedDefault.error.message || ""))) {
      throw markedDefault.error
    }

    return {
      ...created,
      is_default: markedDefault.error ? created.is_default : true,
    }
  } catch (error) {
    if (isMissingRelationError(String((error as any)?.message || ""))) {
      return {
        id: "fallback-personal-workspace",
        owner_user_id: userId,
        name: "Personal Workspace",
        slug: "personal",
        description: "Fallback local workspace",
        is_default: true,
      }
    }
    throw error
  }
}

async function upsertWorkspaceOwnerMember(
  supabase: any,
  workspaceId: string,
  userId: string
) {
  const withInviter = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
    invited_by: userId,
  })
  if (!withInviter.error) return

  if (!isMissingRelationError(String(withInviter.error.message || ""))) {
    throw withInviter.error
  }

  const withoutInviter = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  })
  if (withoutInviter.error && !isMissingRelationError(String(withoutInviter.error.message || ""))) {
    throw withoutInviter.error
  }
}

async function resolveWorkspaceSelectColumns(supabase: any) {
  for (const columns of WORKSPACE_SELECT_CANDIDATES) {
    const probe = await supabase.from("workspaces").select(columns).limit(1)
    if (!probe.error) return columns
    if (!isMissingRelationError(String(probe.error.message || ""))) {
      throw probe.error
    }
  }
  return null
}

export async function createWorkspaceCompatible(
  supabase: any,
  input: {
    userId: string
    name: string
    slugBase: string
    description?: string | null
    isDefault?: boolean
  }
) {
  const name = input.name.trim()
  const baseSlug = (input.slugBase || "workspace").slice(0, 42)
  const maxAttempts = 8
  const selectColumns = await resolveWorkspaceSelectColumns(supabase)

  if (!selectColumns) return createFallbackWorkspace(supabase, input)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`
    const slug = `${baseSlug.slice(0, Math.max(1, 42 - suffix.length))}${suffix}`
    const payloadVariants = input.isDefault
      ? [
          {
            owner_user_id: input.userId,
            name,
            slug,
            description: input.description?.trim() || null,
            is_default: true,
          },
          {
            owner_user_id: input.userId,
            name,
            slug,
            is_default: true,
          },
          {
            owner_user_id: input.userId,
            name,
            slug,
            description: input.description?.trim() || null,
          },
          {
            owner_user_id: input.userId,
            name,
            slug,
          },
        ]
      : [
          {
            owner_user_id: input.userId,
            name,
            slug,
            description: input.description?.trim() || null,
          },
          {
            owner_user_id: input.userId,
            name,
            slug,
          },
        ]

    for (const payload of payloadVariants) {
      const created = await supabase
        .from("workspaces")
        .insert(payload)
        .select(selectColumns)
        .single()

      if (!created.error) {
        await upsertWorkspaceOwnerMember(supabase, created.data.id, input.userId)
        return normalizeWorkspace(created.data)
      }

      const errorMessage = String(created.error.message || "")
      if (isDuplicateConstraintError(created.error)) {
        break
      }

      // Some older schemas may miss optional columns like description/invited_by.
      if (
        isMissingRelationError(errorMessage) &&
        errorMessage.toLowerCase().includes("description") &&
        "description" in payload
      ) {
        continue
      }

      if (
        isMissingRelationError(errorMessage) &&
        errorMessage.toLowerCase().includes("is_default") &&
        "is_default" in payload
      ) {
        continue
      }

      if (!isMissingRelationError(errorMessage)) {
        throw created.error
      }
    }
  }

  throw new Error("A workspace with a similar name already exists. Try a different name.")
}

export async function getWorkspaceRole(supabase: any, workspaceId: string, userId: string) {
  const owned = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_user_id", userId)
    .maybeSingle()

  const ownedMissingRelation =
    !!owned.error && isMissingRelationError(String(owned.error.message || ""))
  if (owned.error && !ownedMissingRelation) throw owned.error
  if (owned.data?.id) return "owner"

  if (ownedMissingRelation) {
    const fallbackOwned = await getFallbackWorkspaceById(supabase, workspaceId, userId)
    if (fallbackOwned?.id) return "owner"
  }

  const member = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  const memberMissingRelation =
    !!member.error && isMissingRelationError(String(member.error.message || ""))
  if (member.error && !memberMissingRelation) {
    throw member.error
  }
  if (member.data?.role) return member.data.role

  if (memberMissingRelation || ownedMissingRelation) {
    const fallbackOwned = await getFallbackWorkspaceById(supabase, workspaceId, userId)
    if (fallbackOwned?.id) return "owner"
  }

  return null
}

export function buildWorkspaceSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
}
