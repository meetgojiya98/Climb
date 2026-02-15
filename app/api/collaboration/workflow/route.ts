import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { readUserFeatureState, writeUserFeatureState } from "@/lib/feature-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "collaboration-workflow"

const ChecklistItemSchema = z.object({
  label: z.string().min(2).max(180),
  owner: z.string().max(120).optional(),
  dueDate: z.string().optional(),
})

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createChecklist"),
    payload: z.object({
      workspaceId: z.string().min(1).max(120),
      title: z.string().min(2).max(160),
      items: z.array(ChecklistItemSchema).min(1).max(30),
    }),
  }),
  z.object({
    action: z.literal("toggleChecklistItem"),
    payload: z.object({
      workspaceId: z.string().min(1).max(120),
      checklistId: z.string().min(1),
      itemId: z.string().min(1),
      done: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal("requestApproval"),
    payload: z.object({
      workspaceId: z.string().min(1).max(120),
      title: z.string().min(2).max(160),
      description: z.string().max(900).optional(),
      requestedFrom: z.string().max(120).optional(),
    }),
  }),
  z.object({
    action: z.literal("decideApproval"),
    payload: z.object({
      workspaceId: z.string().min(1).max(120),
      approvalId: z.string().min(1),
      decision: z.enum(["approved", "changes_requested"]),
      note: z.string().max(900).optional(),
    }),
  }),
])

type CollaborationChecklistItem = {
  id: string
  label: string
  owner: string | null
  dueDate: string | null
  done: boolean
}

type CollaborationChecklist = {
  id: string
  workspaceId: string
  title: string
  items: CollaborationChecklistItem[]
  createdAt: string
  updatedAt: string
}

type ApprovalStatus = "pending" | "approved" | "changes_requested"

type CollaborationApproval = {
  id: string
  workspaceId: string
  title: string
  description: string | null
  requestedFrom: string | null
  status: ApprovalStatus
  decisionNote: string | null
  requestedAt: string
  decidedAt: string | null
}

type CollaborationState = {
  checklists: CollaborationChecklist[]
  approvals: CollaborationApproval[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function safeIso(value?: string | null) {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

function sanitizeState(input: unknown): CollaborationState {
  if (!input || typeof input !== "object") return { checklists: [], approvals: [] }
  const payload = input as { checklists?: unknown[]; approvals?: unknown[] }

  const checklists = Array.isArray(payload.checklists)
    ? payload.checklists
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          if (typeof value.id !== "string" || typeof value.workspaceId !== "string" || typeof value.title !== "string") {
            return null
          }
          const items = Array.isArray(value.items)
            ? value.items
                .map((entry) => {
                  if (!entry || typeof entry !== "object") return null
                  const row = entry as Record<string, unknown>
                  if (typeof row.id !== "string" || typeof row.label !== "string") return null
                  return {
                    id: row.id,
                    label: row.label,
                    owner: typeof row.owner === "string" ? row.owner : null,
                    dueDate: safeIso(typeof row.dueDate === "string" ? row.dueDate : null),
                    done: Boolean(row.done),
                  } satisfies CollaborationChecklistItem
                })
                .filter((entry): entry is CollaborationChecklistItem => Boolean(entry))
            : []
          return {
            id: value.id,
            workspaceId: value.workspaceId,
            title: value.title,
            items,
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
            updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
          } satisfies CollaborationChecklist
        })
        .filter((item): item is CollaborationChecklist => Boolean(item))
        .slice(-300)
    : []

  const approvals = Array.isArray(payload.approvals)
    ? payload.approvals
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          if (
            typeof value.id !== "string" ||
            typeof value.workspaceId !== "string" ||
            typeof value.title !== "string"
          ) {
            return null
          }
          const status: ApprovalStatus =
            value.status === "approved" || value.status === "changes_requested" ? value.status : "pending"
          return {
            id: value.id,
            workspaceId: value.workspaceId,
            title: value.title,
            description: typeof value.description === "string" ? value.description : null,
            requestedFrom: typeof value.requestedFrom === "string" ? value.requestedFrom : null,
            status,
            decisionNote: typeof value.decisionNote === "string" ? value.decisionNote : null,
            requestedAt: safeIso(typeof value.requestedAt === "string" ? value.requestedAt : null) || new Date().toISOString(),
            decidedAt: safeIso(typeof value.decidedAt === "string" ? value.decidedAt : null),
          } satisfies CollaborationApproval
        })
        .filter((item): item is CollaborationApproval => Boolean(item))
        .slice(-600)
    : []

  return { checklists, approvals }
}

function summarizeWorkspace(state: CollaborationState, workspaceId: string) {
  const checklists = state.checklists.filter((item) => item.workspaceId === workspaceId)
  const approvals = state.approvals.filter((item) => item.workspaceId === workspaceId)
  const checklistItems = checklists.flatMap((list) => list.items)
  const doneCount = checklistItems.filter((item) => item.done).length
  const completionRate = checklistItems.length > 0 ? Math.round((doneCount / checklistItems.length) * 100) : 0
  const pendingApprovals = approvals.filter((item) => item.status === "pending").length
  return {
    checklistCount: checklists.length,
    totalChecklistItems: checklistItems.length,
    completionRate,
    pendingApprovals,
  }
}

async function loadState(supabase: any, userId: string) {
  const store = await readUserFeatureState<CollaborationState>(supabase, userId, STORAGE_KEY, {
    checklists: [],
    approvals: [],
  })
  return {
    state: sanitizeState(store.data),
    recordId: store.recordId,
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`collaboration-workflow:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const workspaceId = (request.nextUrl.searchParams.get("workspaceId") || "personal-workspace").trim()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await loadState(supabase, user.id)
    const checklists = state.checklists
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    const approvals = state.approvals
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))

    return ok({
      success: true,
      workspaceId,
      summary: summarizeWorkspace(state, workspaceId),
      checklists,
      approvals,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load collaboration workflow"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`collaboration-workflow:post:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const body = await parseJsonBody(request, ActionSchema)
    const { state, recordId } = await loadState(supabase, user.id)
    const now = new Date().toISOString()
    let nextState: CollaborationState = state

    if (body.action === "createChecklist") {
      const checklist: CollaborationChecklist = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: body.payload.workspaceId,
        title: body.payload.title.trim(),
        items: body.payload.items.map((item, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          label: item.label.trim(),
          owner: item.owner?.trim() || null,
          dueDate: safeIso(item.dueDate) || null,
          done: false,
        })),
        createdAt: now,
        updatedAt: now,
      }
      nextState = {
        ...state,
        checklists: [...state.checklists, checklist].slice(-300),
      }
    }

    if (body.action === "toggleChecklistItem") {
      const { workspaceId, checklistId, itemId, done } = body.payload
      nextState = {
        ...state,
        checklists: state.checklists.map((list) => {
          if (list.workspaceId !== workspaceId || list.id !== checklistId) return list
          return {
            ...list,
            items: list.items.map((item) => (item.id === itemId ? { ...item, done } : item)),
            updatedAt: now,
          }
        }),
      }
    }

    if (body.action === "requestApproval") {
      const approval: CollaborationApproval = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: body.payload.workspaceId,
        title: body.payload.title.trim(),
        description: body.payload.description?.trim() || null,
        requestedFrom: body.payload.requestedFrom?.trim() || null,
        status: "pending",
        decisionNote: null,
        requestedAt: now,
        decidedAt: null,
      }
      nextState = {
        ...state,
        approvals: [...state.approvals, approval].slice(-600),
      }
    }

    if (body.action === "decideApproval") {
      const { workspaceId, approvalId, decision, note } = body.payload
      nextState = {
        ...state,
        approvals: state.approvals.map((approval) => {
          if (approval.workspaceId !== workspaceId || approval.id !== approvalId) return approval
          return {
            ...approval,
            status: decision,
            decisionNote: note?.trim() || null,
            decidedAt: now,
          }
        }),
      }
    }

    await writeUserFeatureState(supabase, user.id, STORAGE_KEY, nextState, { recordId })
    const workspaceId =
      body.action === "toggleChecklistItem" ||
      body.action === "createChecklist" ||
      body.action === "requestApproval" ||
      body.action === "decideApproval"
        ? body.payload.workspaceId
        : "personal-workspace"

    return ok({
      success: true,
      workspaceId,
      summary: summarizeWorkspace(nextState, workspaceId),
      checklists: nextState.checklists.filter((item) => item.workspaceId === workspaceId),
      approvals: nextState.approvals.filter((item) => item.workspaceId === workspaceId),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update collaboration workflow"
    return fail(message, 500)
  }
}

