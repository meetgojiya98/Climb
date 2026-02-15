import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "integrations-inbox-accounts"

const AccountSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  email: z.string().email(),
  syncCadenceMin: z.number().min(5).max(1440).default(30),
  pollingEnabled: z.boolean().default(true),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), payload: AccountSchema }),
  z.object({
    action: z.literal("update"),
    payload: z.object({
      accountId: z.string().min(1),
      syncCadenceMin: z.number().min(5).max(1440).optional(),
      pollingEnabled: z.boolean().optional(),
    }),
  }),
  z.object({ action: z.literal("disconnect"), payload: z.object({ accountId: z.string().min(1) }) }),
])

type InboxAccount = {
  id: string
  provider: "gmail" | "outlook"
  email: string
  status: "connected" | "disconnected"
  pollingEnabled: boolean
  syncCadenceMin: number
  lastConnectedAt: string
  lastPolledAt: string | null
  importedSignals: number
}

type InboxState = {
  accounts: InboxAccount[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): InboxState {
  if (!input || typeof input !== "object") return { accounts: [] }
  const payload = input as { accounts?: unknown[] }
  if (!Array.isArray(payload.accounts)) return { accounts: [] }

  const accounts = payload.accounts
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      const provider = value.provider === "gmail" || value.provider === "outlook" ? value.provider : null
      const email = typeof value.email === "string" ? value.email : ""
      if (!provider || !email) return null
      return {
        id: typeof value.id === "string" ? value.id : generateId("inbox"),
        provider,
        email,
        status: value.status === "disconnected" ? "disconnected" : "connected",
        pollingEnabled: value.pollingEnabled !== false,
        syncCadenceMin: Math.max(5, Math.min(1440, Number(value.syncCadenceMin || 30))),
        lastConnectedAt: safeIso(typeof value.lastConnectedAt === "string" ? value.lastConnectedAt : null) || new Date().toISOString(),
        lastPolledAt: safeIso(typeof value.lastPolledAt === "string" ? value.lastPolledAt : null),
        importedSignals: Math.max(0, Math.round(Number(value.importedSignals || 0))),
      } satisfies InboxAccount
    })
    .filter((item): item is InboxAccount => Boolean(item))
    .slice(-20)

  return { accounts }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<InboxState>(
    supabase,
    userId,
    STORAGE_KEY,
    { accounts: [] },
    sanitizeState
  )
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`inbox-accounts:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await readState(supabase, user.id)
    return ok({ success: true, accounts: state.accounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load inbox accounts"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`inbox-accounts:post:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state, recordId } = await readState(supabase, user.id)
    const now = new Date().toISOString()
    let nextState = state

    if (body.action === "connect") {
      const payload = body.payload
      const existing = state.accounts.find(
        (item) => item.provider === payload.provider && item.email.toLowerCase() === payload.email.toLowerCase()
      )
      if (existing) {
        nextState = {
          accounts: state.accounts.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  status: "connected",
                  pollingEnabled: payload.pollingEnabled,
                  syncCadenceMin: payload.syncCadenceMin,
                  lastConnectedAt: now,
                }
              : item
          ),
        }
      } else {
        const account: InboxAccount = {
          id: generateId("inbox"),
          provider: payload.provider,
          email: payload.email,
          status: "connected",
          pollingEnabled: payload.pollingEnabled,
          syncCadenceMin: payload.syncCadenceMin,
          lastConnectedAt: now,
          lastPolledAt: null,
          importedSignals: 0,
        }
        nextState = { accounts: [...state.accounts, account].slice(-20) }
      }
    }

    if (body.action === "update") {
      nextState = {
        accounts: state.accounts.map((item) =>
          item.id === body.payload.accountId
            ? {
                ...item,
                syncCadenceMin: body.payload.syncCadenceMin ?? item.syncCadenceMin,
                pollingEnabled: body.payload.pollingEnabled ?? item.pollingEnabled,
              }
            : item
        ),
      }
    }

    if (body.action === "disconnect") {
      nextState = {
        accounts: state.accounts.map((item) =>
          item.id === body.payload.accountId
            ? { ...item, status: "disconnected", pollingEnabled: false }
            : item
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, recordId)

    return ok({ success: true, accounts: nextState.accounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update inbox accounts"
    return fail(message, 500)
  }
}
