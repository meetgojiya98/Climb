import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const CALENDAR_KEY = "integrations-calendar"
const WRITEBACK_KEY = "calendar-writeback-history"

const BlockSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  startAt: z.string(),
  endAt: z.string(),
})

const RequestSchema = z.object({
  provider: z.enum(["google", "outlook"]),
  blocks: z.array(BlockSchema).min(1).max(80),
  timezone: z.string().min(2).max(80).default("UTC"),
})

type CalendarAccount = {
  id: string
  provider: "google" | "outlook"
  email: string
  defaultCalendar: string
  writeBackEnabled: boolean
  status: "connected" | "disconnected"
  connectedAt: string
  lastWriteBackAt: string | null
}

type CalendarState = {
  accounts: CalendarAccount[]
}

type WriteBackEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  providerEventId: string
  providerDeepLink: string
}

type WriteBackRun = {
  id: string
  provider: "google" | "outlook"
  timezone: string
  accountEmail: string
  eventCount: number
  createdAt: string
  events: WriteBackEvent[]
}

type WriteBackState = {
  runs: WriteBackRun[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeCalendarState(input: unknown): CalendarState {
  if (!input || typeof input !== "object") return { accounts: [] }
  const payload = input as { accounts?: unknown[] }
  if (!Array.isArray(payload.accounts)) return { accounts: [] }
  const accounts = payload.accounts
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      const provider = value.provider === "google" || value.provider === "outlook" ? value.provider : null
      if (!provider || typeof value.id !== "string" || typeof value.email !== "string") return null
      return {
        id: value.id,
        provider,
        email: value.email,
        defaultCalendar: typeof value.defaultCalendar === "string" ? value.defaultCalendar : "Primary",
        writeBackEnabled: value.writeBackEnabled !== false,
        status: value.status === "disconnected" ? "disconnected" : "connected",
        connectedAt: safeIso(typeof value.connectedAt === "string" ? value.connectedAt : null) || new Date().toISOString(),
        lastWriteBackAt: safeIso(typeof value.lastWriteBackAt === "string" ? value.lastWriteBackAt : null),
      } satisfies CalendarAccount
    })
    .filter((item): item is CalendarAccount => Boolean(item))
  return { accounts }
}

function sanitizeWriteBackState(input: unknown): WriteBackState {
  if (!input || typeof input !== "object") return { runs: [] }
  const payload = input as { runs?: unknown[] }
  if (!Array.isArray(payload.runs)) return { runs: [] }
  const runs = payload.runs
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      const provider = value.provider === "google" || value.provider === "outlook" ? value.provider : null
      if (!provider || typeof value.id !== "string" || typeof value.accountEmail !== "string") return null
      const events = Array.isArray(value.events)
        ? value.events
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (
                typeof row.id !== "string" ||
                typeof row.title !== "string" ||
                typeof row.startAt !== "string" ||
                typeof row.endAt !== "string" ||
                typeof row.providerEventId !== "string" ||
                typeof row.providerDeepLink !== "string"
              ) {
                return null
              }
              return {
                id: row.id,
                title: row.title,
                startAt: row.startAt,
                endAt: row.endAt,
                providerEventId: row.providerEventId,
                providerDeepLink: row.providerDeepLink,
              } satisfies WriteBackEvent
            })
            .filter((entry): entry is WriteBackEvent => Boolean(entry))
        : []
      return {
        id: value.id,
        provider,
        timezone: typeof value.timezone === "string" ? value.timezone : "UTC",
        accountEmail: value.accountEmail,
        eventCount: Math.max(0, Math.round(Number(value.eventCount || events.length))),
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        events,
      } satisfies WriteBackRun
    })
    .filter((item): item is WriteBackRun => Boolean(item))
    .slice(-80)
  return { runs }
}

function formatGoogleDate(value: Date) {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

function buildDeepLink(provider: "google" | "outlook", event: { title: string; startAt: string; endAt: string; description?: string }, timezone: string) {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  const details = event.description || "Climb scheduled block"

  if (provider === "google") {
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatGoogleDate(start)}/${formatGoogleDate(end)}&details=${encodeURIComponent(details)}&ctz=${encodeURIComponent(timezone)}`
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(event.title)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}&body=${encodeURIComponent(details)}`
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`calendar-accept-plan:${getClientIp(request)}`, 30, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const calendarModule = await loadModuleState<CalendarState>(
      supabase,
      user.id,
      CALENDAR_KEY,
      { accounts: [] },
      sanitizeCalendarState
    )

    const account = calendarModule.state.accounts.find(
      (item) => item.provider === body.provider && item.status === "connected" && item.writeBackEnabled
    )

    if (!account) {
      return fail(`No connected ${body.provider} calendar account with write-back enabled.`, 400)
    }

    const writeBackModule = await loadModuleState<WriteBackState>(
      supabase,
      user.id,
      WRITEBACK_KEY,
      { runs: [] },
      sanitizeWriteBackState
    )

    const events = body.blocks.map((block) => {
      const providerEventId = generateId(`${body.provider}-evt`)
      return {
        id: block.id,
        title: block.title,
        startAt: block.startAt,
        endAt: block.endAt,
        providerEventId,
        providerDeepLink: buildDeepLink(body.provider, block, body.timezone),
      } satisfies WriteBackEvent
    })

    const run: WriteBackRun = {
      id: generateId("writeback"),
      provider: body.provider,
      timezone: body.timezone,
      accountEmail: account.email,
      eventCount: events.length,
      createdAt: new Date().toISOString(),
      events,
    }

    const nextWriteBackState: WriteBackState = {
      runs: [...writeBackModule.state.runs, run].slice(-80),
    }

    await saveModuleState(supabase, user.id, WRITEBACK_KEY, nextWriteBackState, writeBackModule.recordId)

    const updatedCalendarState: CalendarState = {
      accounts: calendarModule.state.accounts.map((item) =>
        item.id === account.id
          ? { ...item, lastWriteBackAt: run.createdAt }
          : item
      ),
    }
    await saveModuleState(supabase, user.id, CALENDAR_KEY, updatedCalendarState, calendarModule.recordId)

    return ok({ success: true, writeBack: run, recentRuns: nextWriteBackState.runs.slice(-10).reverse() })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept calendar plan"
    return fail(message, 500)
  }
}
