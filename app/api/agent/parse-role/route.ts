import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, ROLE_PARSER_PROMPT, fillTemplate } from '@/lib/prompts'
import { RoleParsedSchema } from '@/lib/types'
import { parseLLMJson } from '@/lib/llm-json'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { z } from 'zod'

const RequestSchema = z.object({
  jobText: z.string().min(10),
})

const FALLBACK_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'will', 'that', 'this', 'from',
  'have', 'are', 'our', 'all', 'about', 'into', 'their', 'they', 'them', 'job',
  'role', 'years', 'experience', 'work', 'ability', 'skills', 'team', 'plus',
  'preferred', 'required',
])

function buildFallbackRoleParse(jobText: string) {
  const lines = jobText
    .split('\n')
    .map((line) => line.trim().replace(/^[-*•\d.)\s]+/, ''))
    .filter((line) => line.length > 2)

  const requirements = lines
    .filter((line) => /require|must|minimum|qualification|experience|proficient|skill/i.test(line))
    .slice(0, 8)

  const responsibilities = lines
    .filter((line) => /build|design|develop|lead|manage|create|support|deliver|collaborat|maintain|analy/i.test(line))
    .slice(0, 8)

  const mustHaves = requirements
    .filter((line) => /must|required|minimum|at least/i.test(line))
    .slice(0, 6)

  const niceToHaves = requirements
    .filter((line) => /preferred|nice to have|bonus|plus/i.test(line))
    .slice(0, 6)

  const keywordCandidates = jobText.toLowerCase().match(/[a-z][a-z0-9+.#/-]{2,}/g) || []
  const keywords = Array.from(
    new Set(
      keywordCandidates.filter((word) => !FALLBACK_STOP_WORDS.has(word))
    )
  ).slice(0, 20)

  return RoleParsedSchema.parse({
    title: '',
    company: '',
    location: '',
    responsibilities,
    requirements,
    keywords,
    mustHaves,
    niceToHaves,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'parse-role')
    if (!usage.allowed) {
      const response = NextResponse.json(
        {
          error: 'AI rate limit exceeded for role parsing',
          code: 'AI_RATE_LIMIT',
          plan: usage.plan,
          retryAfterSec: usage.retryAfterSec,
          suggestion: usage.plan === 'free'
            ? 'Upgrade to Pro for higher AI throughput.'
            : 'Please retry after the reset window.',
        },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(usage),
            'Retry-After': String(usage.retryAfterSec),
          },
        }
      )
      return response
    }

    // Parse and validate request
    const body = await request.json()
    const { jobText } = RequestSchema.parse(body)

    // Call LLM with retry
    const prompt = fillTemplate(ROLE_PARSER_PROMPT, { JOB_TEXT: jobText })
    
    let parsed: any
    let attempts = 0
    const maxAttempts = 2

    while (attempts <= maxAttempts) {
      try {
        const response = await callLLMWithRetry([
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ], 1, { temperature: 0.3, maxTokens: 2000 })

        parsed = parseLLMJson(response.content, RoleParsedSchema, 'object')
        break
      } catch (error) {
        attempts++
        if (attempts > maxAttempts) {
          console.error('Failed to parse after retries:', error)
          parsed = buildFallbackRoleParse(jobText)
        }
      }
    }

    return NextResponse.json(
      {
      success: true,
      parsed,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Parse role error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to parse role' },
      { status: 500 }
    )
  }
}
