import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, MATCH_GAP_PROMPT, fillTemplate } from '@/lib/prompts'
import { MatchGapAnalysisSchema } from '@/lib/types'
import { parseLLMJson } from '@/lib/llm-json'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { z } from 'zod'

const RequestSchema = z.object({
  roleId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'match-gap')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for match analysis',
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

    // Parse request
    const body = await request.json()
    const { roleId } = RequestSchema.parse(body)

    // Fetch role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .eq('user_id', user.id)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Fetch user profile and resume
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: experiences } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index')

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)

    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id)

    const { data: masterResume } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'master')
      .eq('type', 'resume')
      .single()

    // Build profile summary
    const profileSummary = {
      headline: profile?.headline,
      target_roles: profile?.target_roles,
      experiences: experiences || [],
      projects: projects || [],
      skills: skills?.map(s => s.name) || [],
      master_resume: masterResume?.content || {},
    }

    // Call LLM
    const prompt = fillTemplate(MATCH_GAP_PROMPT, {
      PROFILE: JSON.stringify(profileSummary, null, 2),
      ROLE: JSON.stringify(role.parsed || { job_text: role.job_text }, null, 2),
    })

    let analysis: any
    let attempts = 0
    const maxAttempts = 2

    while (attempts <= maxAttempts) {
      try {
        const response = await callLLMWithRetry([
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ], 1, { temperature: 0.3, maxTokens: 2000 })

        analysis = parseLLMJson(response.content, MatchGapAnalysisSchema, 'object')
        break
      } catch (error) {
        attempts++
        if (attempts > maxAttempts) {
          const roleKeywords = Array.isArray(role.parsed?.keywords) ? role.parsed.keywords : []
          const userSkills = new Set((skills || []).map((s: any) => String(s.name || '').toLowerCase()).filter(Boolean))
          const missingKeywords = roleKeywords.filter((kw: string) => !userSkills.has(kw.toLowerCase())).slice(0, 10)
          const keywordCoverage = roleKeywords.length > 0 ? (roleKeywords.length - missingKeywords.length) / roleKeywords.length : 0.5
          const experienceBoost = (experiences?.length || 0) > 0 ? 20 : 0
          const projectBoost = (projects?.length || 0) > 0 ? 10 : 0
          const summaryBoost = masterResume?.content?.summary ? 10 : 0
          const rawScore = Math.round(keywordCoverage * 60 + experienceBoost + projectBoost + summaryBoost)

          analysis = MatchGapAnalysisSchema.parse({
            matchScore: Math.max(35, Math.min(95, rawScore)),
            missingKeywords,
            suggestedEdits: missingKeywords.slice(0, 3).map((keyword: string) => ({
              area: 'skills',
              suggestion: `Add evidence of ${keyword} in your skills section or project bullets where relevant.`,
            })),
            suggestedBullets: missingKeywords.slice(0, 2).map((keyword: string) => ({
              section: 'Work Experience',
              bullet: `Demonstrated ${keyword} by leading a measurable initiative aligned with team goals.`,
              rationale: `Addresses keyword gap for ${keyword} while keeping the bullet outcome-focused.`,
            })),
          })
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        analysis,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Match gap error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to analyze match' },
      { status: 500 }
    )
  }
}
