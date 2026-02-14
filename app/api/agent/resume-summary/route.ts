import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { SYSTEM_PROMPTS, RESUME_SUMMARY_PROMPT, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const RequestSchema = z.object({
  targetRole: z.string().max(160).optional(),
  personalInfo: z
    .object({
      fullName: z.string().max(120).optional(),
      location: z.string().max(120).optional(),
      linkedin: z.string().max(200).optional(),
      portfolio: z.string().max(200).optional(),
    })
    .optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string().max(100)).max(80).optional().default([]),
  experiences: z
    .array(
      z.object({
        title: z.string().max(120).optional(),
        company: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .max(30)
    .optional()
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string().max(160).optional(),
        degree: z.string().max(120).optional(),
        field: z.string().max(120).optional(),
      })
    )
    .max(20)
    .optional()
    .default([]),
})

const ResponseSchema = z.object({
  summary: z.string().min(20).max(1400),
  focusAreas: z.array(z.string().min(2).max(180)).min(3).max(6),
  confidence: z.number().min(0).max(1),
})

type ResumeSummaryResponse = z.infer<typeof ResponseSchema>

function cleanLine(value: string | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function buildFallbackSummary(input: z.infer<typeof RequestSchema>): ResumeSummaryResponse {
  const role = cleanLine(input.targetRole) || cleanLine(input.experiences[0]?.title) || 'professional role'
  const keySkills = input.skills.filter(Boolean).slice(0, 5)
  const expCount = input.experiences.filter((item) => cleanLine(item.title) || cleanLine(item.description)).length

  const firstSentence = `Results-oriented ${role} with hands-on experience delivering cross-functional outcomes in fast-moving environments.`
  const secondSentence = expCount > 0
    ? `Brings ${expCount} documented experience ${expCount === 1 ? 'entry' : 'entries'} with a focus on execution quality, stakeholder alignment, and measurable progress.`
    : 'Builds structured, execution-focused workflows with clear ownership and iterative improvement.'
  const thirdSentence = keySkills.length > 0
    ? `Core strengths include ${keySkills.join(', ')}, with an emphasis on practical impact and continuous improvement.`
    : 'Known for strong problem-solving, communication, and disciplined delivery against priorities.'

  const focusAreas = [
    'Tie each experience bullet to outcomes and measurable impact',
    'Use role-specific keywords in summary and skill highlights',
    'Keep narrative concise and aligned to target job requirements',
    keySkills.length > 0 ? `Prioritize evidence-backed use of ${keySkills[0]}` : 'Highlight strongest technical and domain capabilities',
  ].slice(0, 6)

  return {
    summary: [firstSentence, secondSentence, thirdSentence].join(' '),
    focusAreas,
    confidence: 0.57,
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

    const usage = await consumeAIUsageQuota(supabase, user.id, 'resume-summary')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for resume summary generation',
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
    const fallback = buildFallbackSummary(parsed)

    let output = fallback
    try {
      const prompt = fillTemplate(RESUME_SUMMARY_PROMPT, {
        RESUME_CONTEXT: JSON.stringify(parsed, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          { role: 'system', content: `${SYSTEM_PROMPTS.SAFETY}\n${SYSTEM_PROMPTS.ATS_SAFE}` },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.45, maxTokens: 800 }
      )

      const ai = parseLLMJson(response.content, ResponseSchema, 'object')
      output = {
        ...ai,
        summary: cleanLine(ai.summary),
        focusAreas: ai.focusAreas.map((item) => cleanLine(item)).filter(Boolean).slice(0, 6),
      }
    } catch (error) {
      console.error('Resume summary fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        summary: output.summary,
        focusAreas: output.focusAreas,
        confidence: output.confidence,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Resume summary route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid resume summary request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate resume summary' },
      { status: 500 }
    )
  }
}
