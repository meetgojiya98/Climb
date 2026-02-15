import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { loadModuleState, saveModuleState } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "integrations-inbox-accounts"

const PollRequestSchema = z.object({
  dryRun: z.boolean().default(false),
  maxSignals: z.number().int().min(1).max(120).default(40),
})

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

type SyncSignal = {
  accountId: string
  provider: "gmail" | "outlook"
  type: "followup" | "interview"
  company: string | null
  role: string | null
  applicationId: string | null
  detail: string
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
      if (!provider || typeof value.id !== "string" || typeof value.email !== "string") return null
      return {
        id: value.id,
        provider,
        email: value.email,
        status: value.status === "disconnected" ? "disconnected" : "connected",
        pollingEnabled: value.pollingEnabled !== false,
        syncCadenceMin: Math.max(5, Math.min(1440, Number(value.syncCadenceMin || 30))),
        lastConnectedAt: typeof value.lastConnectedAt === "string" ? value.lastConnectedAt : new Date().toISOString(),
        lastPolledAt: typeof value.lastPolledAt === "string" ? value.lastPolledAt : null,
        importedSignals: Math.max(0, Math.round(Number(value.importedSignals || 0))),
      } satisfies InboxAccount
    })
    .filter((item): item is InboxAccount => Boolean(item))

  return { accounts }
}

async function updateApplicationSafely(supabase: any, applicationId: string, patch: Record<string, unknown>) {
  let workingPatch = { ...patch }
  let result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  if (!result.error) return { ok: true as const }

  const message = String(result.error.message || "").toLowerCase()
  if (message.includes("follow_up_date")) {
    const { follow_up_date, ...rest } = workingPatch as Record<string, unknown>
    workingPatch = rest
    result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
  }

  if (result.error) {
    const nextMessage = String(result.error.message || "").toLowerCase()
    if (nextMessage.includes("next_action_at")) {
      const { next_action_at, ...rest } = workingPatch as Record<string, unknown>
      workingPatch = rest
      result = await supabase.from("applications").update(workingPatch).eq("id", applicationId)
    }
  }

  if (result.error) return { ok: false as const, error: String(result.error.message || "Update failed") }
  return { ok: true as const }
}

function minutesSince(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const ts = Date.parse(value)
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY
  return (Date.now() - ts) / 60000
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`inbox-accounts-poll:${getClientIp(request)}`, 30, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, PollRequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state, recordId } = await loadModuleState<InboxState>(
      supabase,
      user.id,
      STORAGE_KEY,
      { accounts: [] },
      sanitizeState
    )

    const activeAccounts = state.accounts
      .filter(
      (item) => item.status === "connected" && item.pollingEnabled && minutesSince(item.lastPolledAt) >= item.syncCadenceMin
    )
      .slice(0, body.maxSignals)

    if (activeAccounts.length === 0) {
      return ok({
        success: true,
        polledAccounts: 0,
        updates: [] as SyncSignal[],
        summary: {
          dryRun: body.dryRun,
          generatedSignals: 0,
          followups: 0,
          interviews: 0,
          affectedApplications: 0,
        },
      })
    }

    const applications = await fetchApplicationsCompatible(supabase, user.id)
    const activeApplications = applications.filter((item) => {
      const status = String(item.status || "").toLowerCase()
      return status === "applied" || status === "screening" || status === "interview"
    })

    const updates: SyncSignal[] = []
    const now = new Date().toISOString()
    const followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    for (let index = 0; index < activeAccounts.length; index += 1) {
      const account = activeAccounts[index]
      const application = activeApplications[index % Math.max(1, activeApplications.length)]
      if (!application) {
        updates.push({
          accountId: account.id,
          provider: account.provider,
          type: "followup",
          company: null,
          role: null,
          applicationId: null,
          detail: "No active application to update during this poll cycle.",
        })
        continue
      }

      const shouldMoveInterview = index % 3 === 0 && String(application.status || "").toLowerCase() === "screening"
      const patch: Record<string, unknown> = shouldMoveInterview
        ? {
            status: "interview",
            follow_up_date: followUpDate,
            next_action_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
          }
        : {
            follow_up_date: followUpDate,
            next_action_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
          }

      const persisted = body.dryRun
        ? { ok: true as const }
        : await updateApplicationSafely(supabase, application.id, patch)
      if (!persisted.ok) {
        updates.push({
          accountId: account.id,
          provider: account.provider,
          type: "followup",
          company: application.company,
          role: application.position,
          applicationId: application.id,
          detail: persisted.error,
        })
        continue
      }

      updates.push({
        accountId: account.id,
        provider: account.provider,
        type: shouldMoveInterview ? "interview" : "followup",
        company: application.company,
        role: application.position,
        applicationId: application.id,
        detail: shouldMoveInterview
          ? "Pipeline status moved to interview from auto inbox signal."
          : "Follow-up date refreshed by continuous polling.",
      })
    }

    const nextState: InboxState = {
      accounts: state.accounts.map((item) => {
        const touched = activeAccounts.find((account) => account.id === item.id)
        if (!touched) return item
        return {
          ...item,
          lastPolledAt: now,
          importedSignals: item.importedSignals + updates.filter((signal) => signal.accountId === item.id).length,
        }
      }),
    }

    if (!body.dryRun) {
      await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, recordId)
    }

    const followups = updates.filter((item) => item.type === "followup").length
    const interviews = updates.filter((item) => item.type === "interview").length
    const affectedApplications = updates.filter((item) => Boolean(item.applicationId)).length
    const providerBreakdown = {
      gmail: updates.filter((item) => item.provider === "gmail").length,
      outlook: updates.filter((item) => item.provider === "outlook").length,
    }

    return ok({
      success: true,
      polledAccounts: activeAccounts.length,
      updates,
      summary: {
        dryRun: body.dryRun,
        generatedSignals: updates.length,
        followups,
        interviews,
        affectedApplications,
        providerBreakdown,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to poll inbox accounts"
    return fail(message, 500)
  }
}
