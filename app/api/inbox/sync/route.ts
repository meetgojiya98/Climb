import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { fetchApplicationsCompatible, type ApplicationCompatRow } from "@/lib/supabase/application-compat"

const SyncSchema = z.object({
  provider: z.enum(["gmail", "outlook"]).default("gmail"),
  rawInboxText: z.string().min(20).max(200_000),
  autoCreateMissingApplications: z.boolean().optional().default(true),
})

type EmailEventType = "interview" | "rejection" | "followup" | "other"

type ParsedEmail = {
  subject: string
  from: string
  body: string
  company: string | null
  role: string | null
  eventType: EmailEventType
}

const DISPOSABLE_SENDERS = new Set([
  "gmail",
  "outlook",
  "hotmail",
  "yahoo",
  "mail",
  "protonmail",
  "icloud",
  "aol",
])

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ")
}

function splitIntoEmailChunks(raw: string) {
  const byDivider = raw
    .split(/\n-{3,}\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  if (byDivider.length > 1) return byDivider

  const byFromHeader = raw
    .split(/\n(?=from:\s)/gi)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  if (byFromHeader.length > 1) return byFromHeader

  return [raw.trim()].filter(Boolean)
}

function inferCompanyFromSender(from: string) {
  const emailMatch = from.match(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/i)
  if (!emailMatch) return null
  const domain = emailMatch[1].toLowerCase()
  const parts = domain.split(".")
  if (parts.length < 2) return null
  const root = parts[parts.length - 2]
  if (!root || root.length < 2 || DISPOSABLE_SENDERS.has(root)) return null
  return toTitleCase(root.replace(/[-_]+/g, " "))
}

function inferCompanyFromSubject(subject: string) {
  const matchAt = subject.match(/\bat\s+([a-z0-9& .'-]{2,})/i)
  if (matchAt) return toTitleCase(matchAt[1].trim())
  const matchFrom = subject.match(/\bfrom\s+([a-z0-9& .'-]{2,})/i)
  if (matchFrom) return toTitleCase(matchFrom[1].trim())
  return null
}

function inferRoleFromSubject(subject: string) {
  const normalized = subject.trim()
  if (!normalized) return null

  const patterns = [
    /interview(?:\s+invitation)?[:\-\s]+(.+?)\s+at\s+/i,
    /application\s+for\s+(.+?)\s+(?:at|with)\s+/i,
    /regarding\s+your\s+(.+?)\s+application/i,
    /(.+?)\s+role\s+(?:at|with)\s+/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function classifyEmailEvent(subject: string, body: string): EmailEventType {
  const text = `${subject}\n${body}`.toLowerCase()
  if (
    /\b(regret|unfortunately|not moving forward|declined|rejected|position has been filled|won't be proceeding)\b/i.test(
      text
    )
  ) {
    return "rejection"
  }
  if (/\b(interview|schedule|calendar invite|meet with|next round|panel)\b/i.test(text)) {
    return "interview"
  }
  if (/\b(follow up|following up|next steps|circling back|status update|reminder)\b/i.test(text)) {
    return "followup"
  }
  return "other"
}

function parseEmailChunk(chunk: string): ParsedEmail {
  const lines = chunk.split("\n")
  const subjectLine = lines.find((line) => /^subject:/i.test(line)) || ""
  const fromLine = lines.find((line) => /^from:/i.test(line)) || ""
  const subject = subjectLine.replace(/^subject:\s*/i, "").trim()
  const from = fromLine.replace(/^from:\s*/i, "").trim()

  const bodyStart = lines.findIndex((line) => /^subject:/i.test(line))
  const body =
    bodyStart >= 0
      ? lines.slice(bodyStart + 1).join(" ").replace(/\s+/g, " ").trim()
      : chunk.replace(/\s+/g, " ").trim()

  const company = inferCompanyFromSubject(subject) || inferCompanyFromSender(from)
  const role = inferRoleFromSubject(subject)
  const eventType = classifyEmailEvent(subject, body)

  return {
    subject,
    from,
    body,
    company,
    role,
    eventType,
  }
}

function findBestApplicationMatch(email: ParsedEmail, applications: ApplicationCompatRow[]) {
  const emailCompany = normalizeText(email.company || "")
  const emailRole = normalizeText(email.role || "")

  let best: ApplicationCompatRow | null = null
  let score = 0

  for (const application of applications) {
    const company = normalizeText(application.company || "")
    const role = normalizeText(application.position || "")
    let current = 0
    if (emailCompany && company.includes(emailCompany)) current += 3
    if (emailCompany && emailCompany.includes(company) && company.length > 2) current += 2
    if (emailRole && role.includes(emailRole)) current += 3
    if (emailRole && emailRole.split(" ").some((token) => token.length > 3 && role.includes(token))) current += 1
    if (email.body && company && normalizeText(email.body).includes(company)) current += 1
    if (current > score) {
      score = current
      best = application
    }
  }

  return score >= 2 ? best : null
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

async function createApplicationSafely(
  supabase: any,
  input: {
    userId: string
    company: string
    role: string
    status: string
    followUpDate: string
  }
) {
  const basePayload = {
    user_id: input.userId,
    company: input.company,
    position: input.role,
    status: input.status,
    applied_date: new Date().toISOString().slice(0, 10),
    follow_up_date: input.followUpDate,
    notes: "Created from inbox sync automation",
  }

  const createAttempt = await supabase.from("applications").insert(basePayload).select("id").single()
  if (!createAttempt.error) return { id: String(createAttempt.data.id) }

  const msg = String(createAttempt.error.message || "").toLowerCase()
  if (!msg.includes("follow_up_date")) throw createAttempt.error

  const fallbackPayload = {
    user_id: input.userId,
    company: input.company,
    position: input.role,
    status: input.status,
    applied_date: new Date().toISOString().slice(0, 10),
    notes: "Created from inbox sync automation",
  }

  const fallback = await supabase.from("applications").insert(fallbackPayload).select("id").single()
  if (fallback.error) throw fallback.error
  return { id: String(fallback.data.id) }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`inbox-sync:${getClientIp(request)}`, 20, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, SyncSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const emails = splitIntoEmailChunks(body.rawInboxText)
      .map(parseEmailChunk)
      .filter((item) => item.subject || item.body)

    const applications = await fetchApplicationsCompatible(supabase, user.id)
    const updates: Array<{
      eventType: EmailEventType
      company: string | null
      role: string | null
      matchedApplicationId: string | null
      action: "updated" | "created" | "ignored"
      detail: string
    }> = []

    let updatedCount = 0
    let createdCount = 0
    let ignoredCount = 0
    const defaultFollowUpDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10)

    for (const email of emails) {
      if (email.eventType === "other") {
        ignoredCount += 1
        updates.push({
          eventType: email.eventType,
          company: email.company,
          role: email.role,
          matchedApplicationId: null,
          action: "ignored",
          detail: "No actionable signal found in this email.",
        })
        continue
      }

      const matched = findBestApplicationMatch(email, applications)

      if (matched) {
        const patch: Record<string, unknown> = {}
        if (email.eventType === "interview") {
          patch.status = "interview"
          patch.follow_up_date = defaultFollowUpDate
          patch.next_action_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        } else if (email.eventType === "rejection") {
          patch.status = "rejected"
        } else if (email.eventType === "followup") {
          patch.follow_up_date = defaultFollowUpDate
          patch.next_action_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }

        const persisted = await updateApplicationSafely(supabase, matched.id, patch)
        if (!persisted.ok) {
          ignoredCount += 1
          updates.push({
            eventType: email.eventType,
            company: email.company,
            role: email.role,
            matchedApplicationId: matched.id,
            action: "ignored",
            detail: persisted.error,
          })
          continue
        }

        updatedCount += 1
        updates.push({
          eventType: email.eventType,
          company: email.company,
          role: email.role,
          matchedApplicationId: matched.id,
          action: "updated",
          detail: `Application updated to reflect ${email.eventType} signal.`,
        })
        continue
      }

      if (body.autoCreateMissingApplications && email.company) {
        const status = email.eventType === "rejection" ? "rejected" : email.eventType === "interview" ? "interview" : "applied"
        const role = email.role || "Unknown role"
        const created = await createApplicationSafely(supabase, {
          userId: user.id,
          company: email.company,
          role,
          status,
          followUpDate: defaultFollowUpDate,
        })
        createdCount += 1
        updates.push({
          eventType: email.eventType,
          company: email.company,
          role,
          matchedApplicationId: created.id,
          action: "created",
          detail: "Created new application from inbox signal.",
        })
      } else {
        ignoredCount += 1
        updates.push({
          eventType: email.eventType,
          company: email.company,
          role: email.role,
          matchedApplicationId: null,
          action: "ignored",
          detail: "No matching application found.",
        })
      }
    }

    const byType = updates.reduce(
      (acc, item) => {
        acc[item.eventType] = (acc[item.eventType] || 0) + 1
        return acc
      },
      {} as Record<EmailEventType, number>
    )

    return ok({
      success: true,
      provider: body.provider,
      summary: {
        totalEmailsParsed: emails.length,
        updatedCount,
        createdCount,
        ignoredCount,
        byType,
      },
      updates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync inbox"
    return fail(message, 500)
  }
}
