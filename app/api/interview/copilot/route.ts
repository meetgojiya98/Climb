import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

export const dynamic = "force-dynamic"

const RequestSchema = z.object({
  question: z.string().min(8).max(500),
  transcript: z.string().min(20).max(12000),
  role: z.string().max(120).optional(),
  durationSec: z.number().min(10).max(3600).optional(),
})

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "literally",
  "kind of",
  "sort of",
  "i mean",
]

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function countFillerWords(transcript: string) {
  const normalized = normalizeText(transcript)
  let count = 0
  for (const token of FILLER_WORDS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const expression = new RegExp(`\\b${escaped}\\b`, "g")
    const matches = normalized.match(expression)
    count += matches?.length || 0
  }
  return count
}

function scoreStructure(text: string) {
  const normalized = normalizeText(text)
  const starHits = ["situation", "task", "action", "result"].filter((item) => normalized.includes(item)).length
  const flowHits = ["first", "then", "finally", "because", "therefore", "so that"].filter((item) =>
    normalized.includes(item)
  ).length
  const score = clamp(35 + starHits * 15 + flowHits * 6, 0, 100)
  return score
}

function scoreDepth(text: string) {
  const normalized = normalizeText(text)
  const numbers = (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length
  const ownership = ["i led", "i built", "i owned", "i delivered", "i improved", "i designed"].filter((item) =>
    normalized.includes(item)
  ).length
  const tradeoffSignals = ["tradeoff", "constraint", "decision", "risk", "impact", "metric"].filter((item) =>
    normalized.includes(item)
  ).length
  return clamp(30 + numbers * 8 + ownership * 8 + tradeoffSignals * 9, 0, 100)
}

function scoreClarity(wordCount: number, sentenceCount: number, fillerPer100: number) {
  const avgWordsPerSentence = wordCount / Math.max(1, sentenceCount)
  const lengthPenalty = Math.abs(avgWordsPerSentence - 18) * 2.2
  const fillerPenalty = fillerPer100 * 4.5
  return clamp(Math.round(92 - lengthPenalty - fillerPenalty), 0, 100)
}

function scoreDelivery(wpm: number | null, fillerPer100: number) {
  if (wpm === null) return clamp(Math.round(84 - fillerPer100 * 4), 0, 100)
  const pacePenalty = Math.abs(wpm - 135) * 0.45
  return clamp(Math.round(90 - pacePenalty - fillerPer100 * 3.8), 0, 100)
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`interview-copilot:${getClientIp(request)}`, 50, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const transcript = body.transcript.trim()
    const words = transcript.split(/\s+/).filter(Boolean)
    const wordCount = words.length
    const sentenceCount = transcript
      .split(/[.!?]+/)
      .map((item) => item.trim())
      .filter(Boolean).length
    const fillerCount = countFillerWords(transcript)
    const fillerPer100 = Number(((fillerCount / Math.max(1, wordCount)) * 100).toFixed(1))
    const wpm =
      body.durationSec && body.durationSec > 0
        ? Math.round((wordCount / body.durationSec) * 60)
        : null

    const structure = scoreStructure(transcript)
    const depth = scoreDepth(transcript)
    const clarity = scoreClarity(wordCount, sentenceCount, fillerPer100)
    const delivery = scoreDelivery(wpm, fillerPer100)
    const overall = Math.round(clarity * 0.3 + structure * 0.25 + depth * 0.3 + delivery * 0.15)

    const strengths: string[] = []
    const improvements: string[] = []

    if (structure >= 70) strengths.push("Answer has a clear beginning, middle, and outcome.")
    if (depth >= 70) strengths.push("You provide enough ownership and impact detail.")
    if (clarity >= 70) strengths.push("Delivery is easy to follow for interviewers.")
    if (delivery >= 70) strengths.push("Pace is close to interview-friendly speaking speed.")
    if (!strengths.length) strengths.push("You address the question directly.")

    if (structure < 70) improvements.push("Use explicit STAR framing: situation, task, action, result.")
    if (depth < 70) improvements.push("Add one metric and one decision tradeoff to increase depth.")
    if (clarity < 70) improvements.push("Shorten long sentences and remove repeated filler phrases.")
    if (delivery < 70) improvements.push("Aim for a calmer pace around 120-150 words per minute.")
    if (!improvements.length) improvements.push("End with a stronger close on business impact.")

    const rewritePrompt = `Rewrite this answer for ${body.role || "the target role"} in 5-7 concise sentences. Keep STAR flow and include one measurable result.`

    return ok({
      success: true,
      analysis: {
        question: body.question,
        role: body.role || null,
        wordCount,
        sentenceCount,
        fillerCount,
        fillerPer100,
        wordsPerMinute: wpm,
      },
      scores: {
        clarity,
        structure,
        depth,
        delivery,
        overall,
      },
      guidance: {
        strengths,
        improvements,
        rewritePrompt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to score interview transcript"
    return fail(message, 500)
  }
}

