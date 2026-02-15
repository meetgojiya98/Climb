"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Plus, ShieldCheck, Users2 } from "lucide-react"
import { toast } from "sonner"

const LOCAL_WORKSPACE_STORAGE_KEY = "climb:workspace-fallback:v1"
const LOCAL_WORKSPACE_UPDATED_EVENT = "climb:workspace-fallback-updated"

type Workspace = {
  id: string
  name: string
  slug: string
  description?: string | null
}

type WorkspaceMember = {
  id: string
  user_id: string
  role: "owner" | "admin" | "editor" | "viewer"
  invited_by?: string | null
  created_at?: string
}

function buildWorkspaceSlug(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
  return slug || `workspace-${Date.now().toString().slice(-6)}`
}

function isWorkspaceInfraError(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes("workspace tables are not initialized") ||
    text.includes("workspace migrations and retry") ||
    text.includes("unable to create workspace in this environment") ||
    text.includes("could not find the table") ||
    (text.includes("workspace") && text.includes("schema cache"))
  )
}

function normalizeWorkspace(item: any): Workspace | null {
  if (!item?.id || !item?.name) return null
  return {
    id: String(item.id),
    name: String(item.name),
    slug: String(item.slug || buildWorkspaceSlug(String(item.name))),
    description: typeof item.description === "string" ? item.description : null,
  }
}

function dedupeWorkspaces(items: Workspace[]) {
  const map = new Map<string, Workspace>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

function readLocalWorkspaces() {
  if (typeof window === "undefined") return [] as Workspace[]
  try {
    const raw = window.localStorage.getItem(LOCAL_WORKSPACE_STORAGE_KEY)
    if (!raw) return [] as Workspace[]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [] as Workspace[]
    return dedupeWorkspaces(
      parsed
        .map(normalizeWorkspace)
        .filter((item: Workspace | null): item is Workspace => Boolean(item))
    )
  } catch {
    return [] as Workspace[]
  }
}

function writeLocalWorkspaces(items: Workspace[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LOCAL_WORKSPACE_STORAGE_KEY, JSON.stringify(dedupeWorkspaces(items)))
  window.dispatchEvent(new Event(LOCAL_WORKSPACE_UPDATED_EVENT))
}

export default function WorkspacesPage() {
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [inviteUserId, setInviteUserId] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceMember["role"]>("viewer")

  const selectedWorkspace = useMemo(
    () => workspaces.find((item) => item.id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId]
  )

  const fetchWorkspaces = useCallback(async () => {
    const localFallback = readLocalWorkspaces()
    try {
      setLoading(true)
      const response = await fetch("/api/workspaces", { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message = String(data?.error || "Failed to load workspaces")
        if (isWorkspaceInfraError(message)) {
          setWorkspaces(localFallback)
          if (localFallback.length > 0) {
            setSelectedWorkspaceId((current) => current || localFallback[0].id)
          }
          return
        }
        throw new Error(message)
      }

      const remote = Array.isArray(data?.workspaces)
        ? data.workspaces
            .map(normalizeWorkspace)
            .filter((item: Workspace | null): item is Workspace => Boolean(item))
        : []
      const items = dedupeWorkspaces([...remote, ...localFallback])
      setWorkspaces(items)
      if (items.length > 0) {
        setSelectedWorkspaceId((current) => current || items[0].id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load workspaces"
      if (localFallback.length > 0) {
        setWorkspaces(localFallback)
        setSelectedWorkspaceId((current) => current || localFallback[0].id)
        toast.info("Loaded local workspace fallback")
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMembers = useCallback(async (workspaceId: string) => {
    if (workspaceId.startsWith("local-workspace-")) {
      setMembers([
        {
          id: `local-owner-${workspaceId}`,
          user_id: "Local owner",
          role: "owner",
          invited_by: null,
          created_at: new Date().toISOString(),
        },
      ])
      return
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Failed to load workspace members")
      setMembers(Array.isArray(data?.members) ? data.members : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load workspace members"
      toast.error(message)
      setMembers([])
    }
  }, [])

  useEffect(() => {
    void fetchWorkspaces()
  }, [fetchWorkspaces])

  useEffect(() => {
    if (!selectedWorkspaceId) return
    void fetchMembers(selectedWorkspaceId)
  }, [fetchMembers, selectedWorkspaceId])

  const createWorkspace = async () => {
    const name = newWorkspaceName.trim()
    const description = newWorkspaceDescription.trim() || null
    if (!name) return

    const createWorkspaceInLocalFallback = () => {
      const localWorkspace: Workspace = {
        id: `local-workspace-${Date.now()}`,
        name,
        slug: buildWorkspaceSlug(name),
        description,
      }
      const localItems = dedupeWorkspaces([...readLocalWorkspaces(), localWorkspace])
      writeLocalWorkspaces(localItems)
      setWorkspaces(localItems)
      setSelectedWorkspaceId(localWorkspace.id)
      setMembers([
        {
          id: `local-owner-${localWorkspace.id}`,
          user_id: "Local owner",
          role: "owner",
          invited_by: null,
          created_at: new Date().toISOString(),
        },
      ])
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      toast.success("Workspace created (local fallback mode)")
    }

    try {
      setCreating(true)
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message = String(data?.error || "Failed to create workspace")
        if (!isWorkspaceInfraError(message)) {
          toast.info("Workspace backend unavailable, switching to local fallback.")
        }
        createWorkspaceInLocalFallback()
        return
      }

      const responseWorkspace = normalizeWorkspace(data?.workspace)
      const isResponseLocalFallback =
        Boolean(data?.workspace?.localFallback) ||
        (responseWorkspace?.id || "").startsWith("local-workspace-")

      if (responseWorkspace && isResponseLocalFallback) {
        const localItems = dedupeWorkspaces([...readLocalWorkspaces(), responseWorkspace])
        writeLocalWorkspaces(localItems)
        setWorkspaces(localItems)
        setSelectedWorkspaceId(responseWorkspace.id)
        setMembers([
          {
            id: `local-owner-${responseWorkspace.id}`,
            user_id: "Local owner",
            role: "owner",
            invited_by: null,
            created_at: new Date().toISOString(),
          },
        ])
        setNewWorkspaceName("")
        setNewWorkspaceDescription("")
        toast.success("Workspace created (local fallback mode)")
        return
      }

      toast.success("Workspace created")
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      await fetchWorkspaces()
      if (data?.workspace?.id) setSelectedWorkspaceId(String(data.workspace.id))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create workspace"
      toast.info(`${message}. Using local fallback.`)
      createWorkspaceInLocalFallback()
    } finally {
      setCreating(false)
    }
  }

  const inviteMember = async () => {
    if (!selectedWorkspaceId || !inviteUserId.trim()) return
    if (selectedWorkspaceId.startsWith("local-workspace-")) {
      toast.error("Member management requires enterprise workspace tables.")
      return
    }

    try {
      setInviting(true)
      const response = await fetch(`/api/workspaces/${selectedWorkspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: inviteUserId.trim(),
          role: inviteRole,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Failed to add member")
      toast.success("Member added")
      setInviteUserId("")
      await fetchMembers(selectedWorkspaceId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add member"
      toast.error(message)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="section-shell section-stack">
      <div className="surface-header">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">Collaboration-ready workspace controls, membership, and governance.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/85 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-saffron-500" />
          Enterprise collaboration enabled
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card-elevated p-4 sm:p-5 lg:p-6 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-navy-600" />
            <h2 className="font-semibold">Workspace Catalog</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading workspaces...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selectedWorkspaceId === workspace.id
                      ? "border-saffron-500/35 bg-saffron-500/10"
                      : "border-border hover:bg-secondary/40"
                  }`}
                >
                  <p className="text-sm font-medium">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{workspace.description || "No description"}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">slug: {workspace.slug}</p>
                </button>
              ))}
              {workspaces.length === 0 && <p className="text-sm text-muted-foreground">No workspace records yet.</p>}
            </div>
          )}
        </section>

        <section className="card-elevated p-4 sm:p-5 lg:p-6 space-y-3">
          <h2 className="font-semibold text-sm">Create Workspace</h2>
          <input
            className="input-field"
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
          />
          <textarea
            className="input-field min-h-[90px]"
            placeholder="Description (optional)"
            value={newWorkspaceDescription}
            onChange={(event) => setNewWorkspaceDescription(event.target.value)}
          />
          <button type="button" onClick={createWorkspace} disabled={creating} className="btn-saffron w-full">
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create Workspace"}
          </button>
        </section>
      </div>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="h-4 w-4 text-saffron-500" />
          <h2 className="font-semibold">Members</h2>
        </div>
        {!selectedWorkspace ? (
          <p className="text-sm text-muted-foreground">Select a workspace to manage members.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">{member.user_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">Role: {member.role}</p>
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-muted-foreground">No members found.</p>}
            </div>

            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-sm font-medium">Add Member by User ID</p>
              <input
                className="input-field"
                placeholder="Supabase user UUID"
                value={inviteUserId}
                onChange={(event) => setInviteUserId(event.target.value)}
              />
              <select
                className="input-field"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as WorkspaceMember["role"])}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
              <button type="button" onClick={inviteMember} disabled={inviting} className="btn-outline w-full">
                {inviting ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
