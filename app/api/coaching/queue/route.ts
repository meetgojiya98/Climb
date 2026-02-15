import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "coaching-queue"

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createTask"),
    payload: z.object({
      workspaceId: z.string().min(1).max(120),
      title: z.string().min(2).max(180),
      reviewer: z.string().min(2).max(120),
      dueAt: z.string().optional(),
      slaHours: z.number().min(1).max(168).default(24),
    }),
  }),
  z.object({
    action: z.literal("setStatus"),
    payload: z.object({
      taskId: z.string().min(1),
      status: z.enum(["pending", "in_review", "approved", "changes_requested", "done"]),
    }),
  }),
  z.object({
    action: z.literal("addComment"),
    payload: z.object({
      taskId: z.string().min(1),
      comment: z.string().min(2).max(600),
    }),
  }),
])

type CoachingComment = {
  id: string
  comment: string
  createdAt: string
}

type CoachingTask = {
  id: string
  workspaceId: string
  title: string
  reviewer: string
  dueAt: string | null
  slaHours: number
  status: "pending" | "in_review" | "approved" | "changes_requested" | "done"
  createdAt: string
  updatedAt: string
  comments: CoachingComment[]
}

type CoachingState = {
  tasks: CoachingTask[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): CoachingState {
  if (!input || typeof input !== "object") return { tasks: [] }
  const payload = input as { tasks?: unknown[] }
  if (!Array.isArray(payload.tasks)) return { tasks: [] }

  const tasks = payload.tasks
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if (
        typeof value.id !== "string" ||
        typeof value.workspaceId !== "string" ||
        typeof value.title !== "string" ||
        typeof value.reviewer !== "string"
      ) {
        return null
      }

      const status =
        value.status === "in_review" ||
        value.status === "approved" ||
        value.status === "changes_requested" ||
        value.status === "done"
          ? value.status
          : "pending"

      const comments = Array.isArray(value.comments)
        ? value.comments
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (typeof row.id !== "string" || typeof row.comment !== "string") return null
              return {
                id: row.id,
                comment: row.comment,
                createdAt: safeIso(typeof row.createdAt === "string" ? row.createdAt : null) || new Date().toISOString(),
              } satisfies CoachingComment
            })
            .filter((entry): entry is CoachingComment => Boolean(entry))
            .slice(-20)
        : []

      return {
        id: value.id,
        workspaceId: value.workspaceId,
        title: value.title,
        reviewer: value.reviewer,
        dueAt: safeIso(typeof value.dueAt === "string" ? value.dueAt : null),
        slaHours: Math.max(1, Math.min(168, Math.round(Number(value.slaHours || 24)))),
        status,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
        comments,
      } satisfies CoachingTask
    })
    .filter((item): item is CoachingTask => Boolean(item))
    .slice(-300)

  return { tasks }
}

function summarize(state: CoachingState) {
  const total = state.tasks.length
  const pending = state.tasks.filter((task) => task.status === "pending" || task.status === "in_review").length
  const done = state.tasks.filter((task) => task.status === "done").length
  const now = Date.now()
  const overdue = state.tasks.filter((task) => {
    if (!task.dueAt || task.status === "done") return false
    const ts = Date.parse(task.dueAt)
    return Number.isFinite(ts) && ts < now
  }).length
  return {
    total,
    pending,
    done,
    overdue,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<CoachingState>(supabase, userId, STORAGE_KEY, { tasks: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`coaching-queue:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const tasks = workspaceId
      ? module.state.tasks.filter((task) => task.workspaceId === workspaceId)
      : module.state.tasks

    const sorted = tasks.slice().sort((a, b) => Date.parse(a.dueAt || a.updatedAt) - Date.parse(b.dueAt || b.updatedAt))
    return ok({ success: true, summary: summarize({ tasks }), tasks: sorted })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load coaching queue"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`coaching-queue:post:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const state = module.state
    const now = new Date().toISOString()
    let nextState = state

    if (body.action === "createTask") {
      const dueAt = body.payload.dueAt
        ? safeIso(body.payload.dueAt)
        : new Date(Date.now() + body.payload.slaHours * 60 * 60 * 1000).toISOString()

      const task: CoachingTask = {
        id: generateId("coach-task"),
        workspaceId: body.payload.workspaceId,
        title: body.payload.title,
        reviewer: body.payload.reviewer,
        dueAt,
        slaHours: body.payload.slaHours,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        comments: [],
      }
      nextState = { tasks: [...state.tasks, task].slice(-300) }
    }

    if (body.action === "setStatus") {
      nextState = {
        tasks: state.tasks.map((task) =>
          task.id === body.payload.taskId
            ? { ...task, status: body.payload.status, updatedAt: now }
            : task
        ),
      }
    }

    if (body.action === "addComment") {
      nextState = {
        tasks: state.tasks.map((task) =>
          task.id === body.payload.taskId
            ? {
                ...task,
                updatedAt: now,
                comments: [
                  ...task.comments,
                  {
                    id: generateId("coach-comment"),
                    comment: body.payload.comment,
                    createdAt: now,
                  },
                ].slice(-20),
              }
            : task
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({ success: true, summary: summarize(nextState), tasks: nextState.tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update coaching queue"
    return fail(message, 500)
  }
}
