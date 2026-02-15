import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "interview-video-analysis"

const RequestSchema = z.object({
  question: z.string().min(8).max(500),
  transcript: z.string().min(20).max(12000),
  durationSec: z.number().min(10).max(5400),
  eyeContactPct: z.number().min(0).max(100).optional(),
  pauseCount: z.number().min(0).max(500).optional(),
  confidenceSelfRating: z.number().min(1).max(10).optional(),
})

type AnalysisResult = {
  id: string
  question: string
  durationSec: number
  createdAt: string
  metrics: {
    paceWpm: number
    fillerPer100: number
    eyeContactPct: number
    pauseCount: number
    clarityScore: number
    confidenceScore: number
    structureScore: number
    overallScore: number
  }
  insights: {
    strengths: string[]
    improvements: string[]
  }
  coachPlan?: {
    priority: string[]
    drills: string[]
  }
}

type VideoAnalysisState = {
  history: AnalysisResult[]
}

const FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically", "kind of", "sort of"]

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function countFillers(text: string) {
  const normalized = normalizeText(text)
  let count = 0
  for (const token of FILLER_WORDS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const expression = new RegExp(`\\b${escaped}\\b`, "g")
    count += normalized.match(expression)?.length || 0
  }
  return count
}

function sanitizeState(input: unknown): VideoAnalysisState {
  if (!input || typeof input !== "object") return { history: [] }
  const payload = input as { history?: unknown[] }
  if (!Array.isArray(payload.history)) return { history: [] }
  const history = payload.history
    .reduce<AnalysisResult[]>((acc, item) => {
      if (!item || typeof item !== "object") return acc
      const value = item as Record<string, unknown>
      if (typeof value.id !== "string" || typeof value.question !== "string") return acc
      acc.push({
        id: value.id,
        question: value.question,
        durationSec: Math.max(10, Math.round(Number(value.durationSec || 60))),
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        metrics: (value.metrics || {}) as AnalysisResult["metrics"],
        insights: (value.insights || { strengths: [], improvements: [] }) as AnalysisResult["insights"],
        coachPlan: value.coachPlan && typeof value.coachPlan === "object"
          ? (value.coachPlan as AnalysisResult["coachPlan"])
          : undefined,
      })
      return acc
    }, [])
    .slice(-100)
  return { history }
}

function summarizeHistory(history: AnalysisResult[]) {
  if (history.length === 0) {
    return {
      sessions: 0,
      avgOverallScore: 0,
      avgConfidenceScore: 0,
      avgClarityScore: 0,
      trendDelta: 0,
    }
  }
  const recent = history.slice(0, 12)
  const avg = (values: number[]) => Math.round(values.reduce((sum, item) => sum + item, 0) / Math.max(1, values.length))
  const avgOverallScore = avg(recent.map((item) => item.metrics.overallScore))
  const avgConfidenceScore = avg(recent.map((item) => item.metrics.confidenceScore))
  const avgClarityScore = avg(recent.map((item) => item.metrics.clarityScore))
  const trendDelta = recent.length >= 2 ? recent[0].metrics.overallScore - recent[recent.length - 1].metrics.overallScore : 0
  return {
    sessions: history.length,
    avgOverallScore,
    avgConfidenceScore,
    avgClarityScore,
    trendDelta,
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`video-analysis:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await loadModuleState<VideoAnalysisState>(
      supabase,
      user.id,
      STORAGE_KEY,
      { history: [] },
      sanitizeState
    )

    const history = [...module.state.history].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    const trend = history.slice(0, 8).reverse().map((item) => ({
      createdAt: item.createdAt,
      overallScore: item.metrics.overallScore,
      confidenceScore: item.metrics.confidenceScore,
    }))

    return ok({
      success: true,
      latest: history[0] || null,
      history: history.slice(0, 20),
      trend,
      summary: summarizeHistory(history),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load video analysis"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`video-analysis:post:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await loadModuleState<VideoAnalysisState>(
      supabase,
      user.id,
      STORAGE_KEY,
      { history: [] },
      sanitizeState
    )

    const words = body.transcript.split(/\s+/).filter(Boolean)
    const wordCount = words.length
    const fillerCount = countFillers(body.transcript)
    const fillerPer100 = Number(((fillerCount / Math.max(1, wordCount)) * 100).toFixed(1))
    const paceWpm = Math.round((wordCount / body.durationSec) * 60)
    const eyeContactPct = body.eyeContactPct ?? clamp(68 + (body.confidenceSelfRating || 6) * 3 - fillerPer100, 35, 96)
    const pauseCount = body.pauseCount ?? Math.round(body.durationSec / 18)

    const clarityScore = clamp(Math.round(92 - Math.abs(paceWpm - 135) * 0.35 - fillerPer100 * 3.4), 0, 100)
    const confidenceScore = clamp(Math.round(eyeContactPct * 0.55 + (body.confidenceSelfRating || 6) * 4.5 - fillerPer100), 0, 100)
    const structureSignals = ["situation", "task", "action", "result", "first", "then", "finally"]
    const structureHits = structureSignals.filter((signal) => normalizeText(body.transcript).includes(signal)).length
    const structureScore = clamp(40 + structureHits * 8, 0, 100)
    const overallScore = Math.round(clarityScore * 0.35 + confidenceScore * 0.35 + structureScore * 0.3)

    const strengths: string[] = []
    const improvements: string[] = []
    if (clarityScore >= 70) strengths.push("Delivery is clear enough for interviewer comprehension.")
    if (confidenceScore >= 70) strengths.push("Presence and confidence signal are strong.")
    if (structureScore >= 70) strengths.push("Answer follows a structured storyline.")
    if (!strengths.length) strengths.push("Answer addresses the question directly.")

    if (clarityScore < 70) improvements.push("Reduce filler words and shorten long sentence chains.")
    if (confidenceScore < 70) improvements.push("Maintain camera gaze and stronger opening statement.")
    if (structureScore < 70) improvements.push("Use STAR framing with one clear measurable result.")
    if (paceWpm > 170 || paceWpm < 95) improvements.push("Aim for pacing around 120-150 words per minute.")

    const priority: string[] = []
    if (clarityScore < 70) priority.push("clarity")
    if (confidenceScore < 70) priority.push("confidence")
    if (structureScore < 70) priority.push("structure")
    if (priority.length === 0) priority.push("consistency")

    const result: AnalysisResult = {
      id: generateId("video-analysis"),
      question: body.question,
      durationSec: body.durationSec,
      createdAt: new Date().toISOString(),
      metrics: {
        paceWpm,
        fillerPer100,
        eyeContactPct,
        pauseCount,
        clarityScore,
        confidenceScore,
        structureScore,
        overallScore,
      },
      insights: {
        strengths,
        improvements,
      },
      coachPlan: {
        priority,
        drills: [
          "Answer in 60-90 seconds with STAR framing.",
          "Record one rehearsal and cut filler words by 20%.",
          "Lead with the measurable result in the first sentence.",
        ],
      },
    }

    const nextState: VideoAnalysisState = {
      history: [...module.state.history, result].slice(-100),
    }
    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    const sortedHistory = nextState.history.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return ok({
      success: true,
      analysis: result,
      trend: nextState.history.slice(-8).map((item) => ({ createdAt: item.createdAt, overallScore: item.metrics.overallScore })),
      summary: summarizeHistory(sortedHistory),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze interview video"
    return fail(message, 500)
  }
}
