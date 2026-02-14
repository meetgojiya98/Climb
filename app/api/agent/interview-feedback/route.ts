import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { SYSTEM_PROMPTS, INTERVIEW_FEEDBACK_PROMPT, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const RequestSchema = z.object({
  category: z.string().min(2).max(80),
  question: z.string().min(8).max(1000),
  answer: z.string().min(20).max(6000),
})

const ResponseSchema = z.object({
  overallRating: z.enum(['strong', 'good', 'needs_work']),
  score: z.number().min(0).max(100),
  feedback: z.string().min(30).max(2200),
  strengths: z.array(z.string().min(3).max(220)).min(2).max(4),
  improvements: z.array(z.string().min(3).max(220)).min(2).max(4),
  rewriteTip: z.string().min(6).max(280),
  confidence: z.number().min(0).max(1),
})

type InterviewFeedback = z.infer<typeof ResponseSchema>

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((item) => haystack.includes(item))
}

function inferRating(score: number): InterviewFeedback['overallRating'] {
  if (score >= 82) return 'strong'
  if (score >= 62) return 'good'
  return 'needs_work'
}

function buildFallbackFeedback(input: z.infer<typeof RequestSchema>): InterviewFeedback {
  const answer = input.answer.trim()
  const lower = answer.toLowerCase()
  const words = answer.split(/\s+/).filter(Boolean).length

  const hasStructure = includesAny(lower, [
    'situation',
    'task',
    'action',
    'result',
    'first',
    'then',
    'finally',
  ])
  const hasMetrics = /\b\d+%|\b\d+\b/.test(answer)
  const hasOwnership = includesAny(lower, ['i led', 'i built', 'i designed', 'i delivered', 'i implemented', 'i owned'])
  const hasOutcomeLanguage = includesAny(lower, ['result', 'impact', 'improved', 'reduced', 'increased', 'delivered'])

  let score = 35
  score += Math.min(25, Math.round(words / 12))
  if (hasStructure) score += 14
  if (hasMetrics) score += 12
  if (hasOwnership) score += 9
  if (hasOutcomeLanguage) score += 10
  score = Math.max(0, Math.min(100, score))

  const overallRating = inferRating(score)
  const strengths: string[] = []
  const improvements: string[] = []

  if (words >= 90) strengths.push('Answer provides enough detail to evaluate your approach')
  if (hasStructure) strengths.push('Response shows an organized flow that is easy to follow')
  if (hasOwnership) strengths.push('You describe your direct contribution clearly')
  if (hasMetrics) strengths.push('You include quantitative evidence to support impact')
  if (strengths.length < 2) {
    strengths.push('Response addresses the question directly')
    strengths.push('Tone is professional and focused')
  }

  if (!hasStructure) improvements.push('Use an explicit STAR sequence: Situation, Task, Action, Result')
  if (!hasMetrics) improvements.push('Add one measurable outcome to make your impact credible')
  if (words < 70) improvements.push('Add more context on constraints, decisions, and tradeoffs')
  if (!hasOutcomeLanguage) improvements.push('Close with a clear outcome and what changed because of your actions')
  if (improvements.length < 2) {
    improvements.push('Reduce filler and keep each sentence tied to impact')
    improvements.push('End with one lesson learned or process improvement')
  }

  const feedback = [
    `Your answer is rated ${overallRating.replace('_', ' ')} with a score of ${score}/100.`,
    hasStructure
      ? 'Structure is reasonably clear, which makes your story easier for an interviewer to track.'
      : 'Structure is currently loose; interviewers may struggle to follow the full story.',
    hasMetrics
      ? 'Including quantitative evidence strengthens your credibility.'
      : 'The response needs at least one concrete metric to demonstrate impact.',
    'Refine the answer to focus on your decision-making, execution, and measurable outcomes.',
  ].join(' ')

  const rewriteTip = hasMetrics
    ? 'Tighten to 4-6 sentences: context, your action, measurable result, and one lesson.'
    : 'Rewrite the closing sentence to include one specific number that quantifies the result.'

  return {
    overallRating,
    score,
    feedback,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    rewriteTip,
    confidence: 0.6,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'interview-feedback')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for interview feedback',
          code: 'AI_RATE_LIMIT',
          plan: usage.plan,
          retryAfterSec: usage.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(usage),
            'Retry-After': String(usage.retryAfterSec),
          },
        }
      )
    }

    const body = await request.json()
    const parsed = RequestSchema.parse(body)
    let feedback = buildFallbackFeedback(parsed)

    try {
      const prompt = fillTemplate(INTERVIEW_FEEDBACK_PROMPT, {
        CATEGORY: parsed.category,
        QUESTION: parsed.question,
        ANSWER: parsed.answer,
      })

      const response = await callLLMWithRetry(
        [
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1100 }
      )

      feedback = parseLLMJson(response.content, ResponseSchema, 'object')
    } catch (error) {
      console.error('Interview feedback fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        feedback,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Interview feedback route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid interview feedback request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate interview feedback' },
      { status: 500 }
    )
  }
}
