import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { readUserFeatureState, writeUserFeatureState } from "@/lib/feature-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "networking-crm"

const ContactStatusSchema = z.enum(["new", "contacted", "responded", "intro_requested", "referred", "inactive"])

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().min(1).max(120),
  title: z.string().max(120).optional(),
  channel: z.string().max(80).optional(),
  relationshipStrength: z.number().min(1).max(10).default(5),
  warmPath: z.string().max(220).optional(),
  nextTouchAt: z.string().optional(),
  notes: z.string().max(600).optional(),
})

const UpdateContactSchema = z.object({
  contactId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).max(120).optional(),
    company: z.string().min(1).max(120).optional(),
    title: z.string().max(120).optional(),
    channel: z.string().max(80).optional(),
    relationshipStrength: z.number().min(1).max(10).optional(),
    warmPath: z.string().max(220).optional(),
    nextTouchAt: z.string().optional(),
    notes: z.string().max(600).optional(),
    status: ContactStatusSchema.optional(),
  }),
})

const LogActivitySchema = z.object({
  contactId: z.string().min(1),
  activityType: z.enum(["outreach", "reply", "meeting", "intro_request", "referral"]),
  note: z.string().max(320).optional(),
})

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addContact"), payload: ContactSchema }),
  z.object({ action: z.literal("updateContact"), payload: UpdateContactSchema }),
  z.object({ action: z.literal("logActivity"), payload: LogActivitySchema }),
  z.object({ action: z.literal("removeContact"), payload: z.object({ contactId: z.string().min(1) }) }),
])

type ContactStatus = z.infer<typeof ContactStatusSchema>

type NetworkingContact = {
  id: string
  name: string
  company: string
  title: string | null
  channel: string | null
  relationshipStrength: number
  warmPath: string | null
  notes: string | null
  status: ContactStatus
  outreachCount: number
  replyCount: number
  referralCount: number
  lastTouchAt: string | null
  nextTouchAt: string | null
  createdAt: string
  updatedAt: string
}

type NetworkingActivity = {
  id: string
  contactId: string
  activityType: "outreach" | "reply" | "meeting" | "intro_request" | "referral"
  note: string | null
  createdAt: string
}

type NetworkingState = {
  contacts: NetworkingContact[]
  activities: NetworkingActivity[]
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

function sanitizeState(input: unknown): NetworkingState {
  if (!input || typeof input !== "object") return { contacts: [], activities: [] }
  const payload = input as { contacts?: unknown[]; activities?: unknown[] }
  const contacts = Array.isArray(payload.contacts)
    ? payload.contacts
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const status = ContactStatusSchema.safeParse(value.status || "new")
          if (!status.success) return null
          const id = typeof value.id === "string" ? value.id : ""
          const name = typeof value.name === "string" ? value.name : ""
          const company = typeof value.company === "string" ? value.company : ""
          if (!id || !name || !company) return null
          return {
            id,
            name,
            company,
            title: typeof value.title === "string" ? value.title : null,
            channel: typeof value.channel === "string" ? value.channel : null,
            relationshipStrength: Math.min(10, Math.max(1, Number(value.relationshipStrength || 5))),
            warmPath: typeof value.warmPath === "string" ? value.warmPath : null,
            notes: typeof value.notes === "string" ? value.notes : null,
            status: status.data,
            outreachCount: Math.max(0, Math.round(Number(value.outreachCount || 0))),
            replyCount: Math.max(0, Math.round(Number(value.replyCount || 0))),
            referralCount: Math.max(0, Math.round(Number(value.referralCount || 0))),
            lastTouchAt: safeIso(typeof value.lastTouchAt === "string" ? value.lastTouchAt : null),
            nextTouchAt: safeIso(typeof value.nextTouchAt === "string" ? value.nextTouchAt : null),
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
            updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
          } satisfies NetworkingContact
        })
        .filter((item): item is NetworkingContact => Boolean(item))
        .slice(-500)
    : []

  const activities = Array.isArray(payload.activities)
    ? payload.activities
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const type = value.activityType
          if (
            type !== "outreach" &&
            type !== "reply" &&
            type !== "meeting" &&
            type !== "intro_request" &&
            type !== "referral"
          ) {
            return null
          }
          if (typeof value.id !== "string" || typeof value.contactId !== "string") return null
          return {
            id: value.id,
            contactId: value.contactId,
            activityType: type,
            note: typeof value.note === "string" ? value.note : null,
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
          } satisfies NetworkingActivity
        })
        .filter((item): item is NetworkingActivity => Boolean(item))
        .slice(-2000)
    : []

  return { contacts, activities }
}

function summarize(state: NetworkingState) {
  const totalContacts = state.contacts.length
  const outreach = state.activities.filter((item) => item.activityType === "outreach").length
  const replies = state.activities.filter((item) => item.activityType === "reply").length
  const referrals = state.activities.filter((item) => item.activityType === "referral").length
  const upcomingTouches = state.contacts.filter((contact) => {
    if (!contact.nextTouchAt) return false
    const ts = Date.parse(contact.nextTouchAt)
    return Number.isFinite(ts) && ts <= Date.now() + 7 * 24 * 60 * 60 * 1000
  }).length

  return {
    totalContacts,
    outreach,
    replies,
    referrals,
    replyRate: outreach > 0 ? Math.round((replies / outreach) * 100) : 0,
    referralConversionRate: outreach > 0 ? Math.round((referrals / outreach) * 100) : 0,
    upcomingTouches,
  }
}

async function loadState(supabase: any, userId: string) {
  const store = await readUserFeatureState<NetworkingState>(supabase, userId, STORAGE_KEY, {
    contacts: [],
    activities: [],
  })
  return {
    state: sanitizeState(store.data),
    recordId: store.recordId,
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`networking-crm:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const { state } = await loadState(supabase, user.id)
    const contacts = [...state.contacts].sort((a, b) => {
      const aScore = a.relationshipStrength * 10 + a.replyCount * 8 + a.referralCount * 15
      const bScore = b.relationshipStrength * 10 + b.replyCount * 8 + b.referralCount * 15
      return bScore - aScore
    })
    const activities = [...state.activities].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

    return ok({
      success: true,
      summary: summarize(state),
      contacts,
      activities: activities.slice(0, 250),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load networking CRM"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`networking-crm:post:${getClientIp(request)}`, 80, 60_000)
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
    let nextState: NetworkingState = state

    if (body.action === "addContact") {
      const payload = body.payload
      const contact: NetworkingContact = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: payload.name.trim(),
        company: payload.company.trim(),
        title: payload.title?.trim() || null,
        channel: payload.channel?.trim() || null,
        relationshipStrength: payload.relationshipStrength,
        warmPath: payload.warmPath?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: "new",
        outreachCount: 0,
        replyCount: 0,
        referralCount: 0,
        lastTouchAt: null,
        nextTouchAt: safeIso(payload.nextTouchAt) || null,
        createdAt: now,
        updatedAt: now,
      }
      nextState = {
        ...state,
        contacts: [...state.contacts, contact].slice(-500),
      }
    }

    if (body.action === "updateContact") {
      const { contactId, patch } = body.payload
      nextState = {
        ...state,
        contacts: state.contacts.map((contact) => {
          if (contact.id !== contactId) return contact
          return {
            ...contact,
            name: patch.name?.trim() ?? contact.name,
            company: patch.company?.trim() ?? contact.company,
            title: patch.title?.trim() ?? contact.title,
            channel: patch.channel?.trim() ?? contact.channel,
            relationshipStrength: patch.relationshipStrength ?? contact.relationshipStrength,
            warmPath: patch.warmPath?.trim() ?? contact.warmPath,
            notes: patch.notes?.trim() ?? contact.notes,
            status: patch.status ?? contact.status,
            nextTouchAt: safeIso(patch.nextTouchAt) ?? contact.nextTouchAt,
            updatedAt: now,
          }
        }),
      }
    }

    if (body.action === "logActivity") {
      const { contactId, activityType, note } = body.payload
      const activity: NetworkingActivity = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        contactId,
        activityType,
        note: note?.trim() || null,
        createdAt: now,
      }
      nextState = {
        contacts: state.contacts.map((contact) => {
          if (contact.id !== contactId) return contact
          return {
            ...contact,
            outreachCount: contact.outreachCount + (activityType === "outreach" || activityType === "intro_request" ? 1 : 0),
            replyCount: contact.replyCount + (activityType === "reply" ? 1 : 0),
            referralCount: contact.referralCount + (activityType === "referral" ? 1 : 0),
            status:
              activityType === "reply"
                ? "responded"
                : activityType === "referral"
                  ? "referred"
                  : activityType === "intro_request"
                    ? "intro_requested"
                    : "contacted",
            lastTouchAt: now,
            updatedAt: now,
          }
        }),
        activities: [...state.activities, activity].slice(-2000),
      }
    }

    if (body.action === "removeContact") {
      nextState = {
        contacts: state.contacts.filter((contact) => contact.id !== body.payload.contactId),
        activities: state.activities.filter((activity) => activity.contactId !== body.payload.contactId),
      }
    }

    await writeUserFeatureState(supabase, user.id, STORAGE_KEY, nextState, { recordId })

    return ok({
      success: true,
      summary: summarize(nextState),
      contacts: nextState.contacts,
      activities: nextState.activities.slice(-120),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update networking CRM"
    return fail(message, 500)
  }
}

