import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "documents-versioning"

const VersionSchema = z.object({
  docType: z.enum(["resume", "cover_letter"]),
  docId: z.string().min(1).max(120),
  title: z.string().min(2).max(180),
  content: z.string().min(5).max(40000),
})

const ConversionSchema = z.object({
  docId: z.string().min(1).max(120),
  versionId: z.string().min(1),
  stage: z.enum(["sent", "reply", "interview", "offer", "rejected"]),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveVersion"), payload: VersionSchema }),
  z.object({ action: z.literal("rollback"), payload: z.object({ docId: z.string().min(1), versionId: z.string().min(1) }) }),
  z.object({ action: z.literal("logConversion"), payload: ConversionSchema }),
])

type DocVersionMetrics = {
  sent: number
  reply: number
  interview: number
  offer: number
  rejected: number
}

type DocVersion = {
  id: string
  title: string
  content: string
  createdAt: string
  metrics: DocVersionMetrics
}

type VersionedDocument = {
  docType: "resume" | "cover_letter"
  docId: string
  activeVersionId: string
  versions: DocVersion[]
  updatedAt: string
}

type VersioningState = {
  documents: VersionedDocument[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function emptyMetrics(): DocVersionMetrics {
  return { sent: 0, reply: 0, interview: 0, offer: 0, rejected: 0 }
}

function sanitizeState(input: unknown): VersioningState {
  if (!input || typeof input !== "object") return { documents: [] }
  const payload = input as { documents?: unknown[] }
  if (!Array.isArray(payload.documents)) return { documents: [] }

  const documents = payload.documents
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if ((value.docType !== "resume" && value.docType !== "cover_letter") || typeof value.docId !== "string") {
        return null
      }

      const versions = Array.isArray(value.versions)
        ? value.versions
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.content !== "string") return null
              const metricsRaw = (row.metrics || {}) as Record<string, unknown>
              return {
                id: row.id,
                title: row.title,
                content: row.content,
                createdAt: safeIso(typeof row.createdAt === "string" ? row.createdAt : null) || new Date().toISOString(),
                metrics: {
                  sent: Math.max(0, Math.round(Number(metricsRaw.sent || 0))),
                  reply: Math.max(0, Math.round(Number(metricsRaw.reply || 0))),
                  interview: Math.max(0, Math.round(Number(metricsRaw.interview || 0))),
                  offer: Math.max(0, Math.round(Number(metricsRaw.offer || 0))),
                  rejected: Math.max(0, Math.round(Number(metricsRaw.rejected || 0))),
                },
              } satisfies DocVersion
            })
            .filter((entry): entry is DocVersion => Boolean(entry))
            .slice(-60)
        : []

      if (versions.length === 0) return null

      const activeVersionId =
        typeof value.activeVersionId === "string" && versions.some((version) => version.id === value.activeVersionId)
          ? value.activeVersionId
          : versions[versions.length - 1].id

      return {
        docType: value.docType,
        docId: value.docId,
        activeVersionId,
        versions,
        updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
      } satisfies VersionedDocument
    })
    .filter((item): item is VersionedDocument => Boolean(item))
    .slice(-40)

  return { documents }
}

function summarizeDocument(doc: VersionedDocument) {
  const active = doc.versions.find((version) => version.id === doc.activeVersionId) || doc.versions[doc.versions.length - 1]
  const leaderboard = doc.versions
    .map((version) => {
      const sent = version.metrics.sent
      const replyRate = sent > 0 ? Math.round((version.metrics.reply / sent) * 100) : 0
      const interviewRate = sent > 0 ? Math.round((version.metrics.interview / sent) * 100) : 0
      const offerRate = sent > 0 ? Math.round((version.metrics.offer / sent) * 100) : 0
      return {
        versionId: version.id,
        title: version.title,
        createdAt: version.createdAt,
        sent,
        replyRate,
        interviewRate,
        offerRate,
      }
    })
    .sort((a, b) => b.offerRate - a.offerRate || b.interviewRate - a.interviewRate || b.replyRate - a.replyRate)

  return {
    docType: doc.docType,
    docId: doc.docId,
    activeVersionId: active.id,
    activeTitle: active.title,
    totalVersions: doc.versions.length,
    leaderboard,
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<VersioningState>(supabase, userId, STORAGE_KEY, { documents: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`documents-versioning:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const documents = module.state.documents
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

    return ok({
      success: true,
      documents,
      summaries: documents.map(summarizeDocument),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document versions"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`documents-versioning:post:${getClientIp(request)}`, 80, 60_000)
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

    if (body.action === "saveVersion") {
      const payload = body.payload
      const version: DocVersion = {
        id: generateId("doc-version"),
        title: payload.title,
        content: payload.content,
        createdAt: now,
        metrics: emptyMetrics(),
      }
      const existing = state.documents.find((doc) => doc.docId === payload.docId)

      if (existing) {
        nextState = {
          documents: state.documents.map((doc) =>
            doc.docId === payload.docId
              ? {
                  ...doc,
                  docType: payload.docType,
                  activeVersionId: version.id,
                  versions: [...doc.versions, version].slice(-60),
                  updatedAt: now,
                }
              : doc
          ),
        }
      } else {
        nextState = {
          documents: [
            ...state.documents,
            {
              docType: payload.docType,
              docId: payload.docId,
              activeVersionId: version.id,
              versions: [version],
              updatedAt: now,
            },
          ].slice(-40),
        }
      }
    }

    if (body.action === "rollback") {
      nextState = {
        documents: state.documents.map((doc) =>
          doc.docId === body.payload.docId && doc.versions.some((version) => version.id === body.payload.versionId)
            ? {
                ...doc,
                activeVersionId: body.payload.versionId,
                updatedAt: now,
              }
            : doc
        ),
      }
    }

    if (body.action === "logConversion") {
      const { docId, versionId, stage } = body.payload
      nextState = {
        documents: state.documents.map((doc) =>
          doc.docId === docId
            ? {
                ...doc,
                updatedAt: now,
                versions: doc.versions.map((version) => {
                  if (version.id !== versionId) return version
                  return {
                    ...version,
                    metrics: {
                      ...version.metrics,
                      [stage]: version.metrics[stage] + 1,
                    },
                  }
                }),
              }
            : doc
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      success: true,
      documents: nextState.documents,
      summaries: nextState.documents.map(summarizeDocument),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document versions"
    return fail(message, 500)
  }
}
