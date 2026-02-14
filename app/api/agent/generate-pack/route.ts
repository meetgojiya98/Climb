import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, RESUME_TAILOR_PROMPT, COVER_LETTER_PROMPT, FOLLOWUP_PROMPT, fillTemplate } from '@/lib/prompts'
import { ResumeContentSchema, CoverLetterContentSchema, FollowUpTemplateSchema, MatchGapAnalysisSchema } from '@/lib/types'
import { parseLLMJson } from '@/lib/llm-json'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { z } from 'zod'

const RequestSchema = z.object({
  roleId: z.string().uuid(),
})

const FollowUpArraySchema = z.array(FollowUpTemplateSchema)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'generate-pack')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for pack generation',
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
    const { roleId } = RequestSchema.parse(body)

    // Fetch role and related data
    const { data: role } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .eq('user_id', user.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

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

    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('role_id', roleId)
      .eq('user_id', user.id)
      .single()

    // Build master resume object
    const masterResumeObj = masterResume?.content || {
      header: { name: profile?.full_name || 'User' },
      summary: '',
      skills: skills?.map(s => ({ category: 'Skills', items: [s.name] })) || [],
      experience: experiences?.map(e => ({
        company: e.company,
        title: e.title,
        startDate: e.start_date,
        endDate: e.end_date,
        bullets: Array.isArray(e.highlights) ? e.highlights : [],
      })) || [],
      projects: projects?.map(p => ({
        name: p.name,
        techStack: p.tech_stack || [],
        bullets: Array.isArray(p.highlights) ? p.highlights : [],
      })) || [],
    }

    // Step 1: Get gap analysis
    let gapAnalysis = MatchGapAnalysisSchema.parse({
      matchScore: 50,
      missingKeywords: [],
      suggestedEdits: [],
      suggestedBullets: [],
    })

    try {
      const gapResponse = await fetch(`${request.nextUrl.origin}/api/agent/match-gap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': request.headers.get('cookie') || '' },
        body: JSON.stringify({ roleId }),
      })

      const gapData = await gapResponse.json().catch(() => null)
      if (gapResponse.ok && gapData?.analysis) {
        gapAnalysis = MatchGapAnalysisSchema.parse(gapData.analysis)
      }
    } catch (error) {
      console.error('Gap analysis fallback triggered:', error)
    }

    // Step 2: Generate tailored resume
    const resumePrompt = fillTemplate(RESUME_TAILOR_PROMPT, {
      MASTER_RESUME: JSON.stringify(masterResumeObj, null, 2),
      ROLE: JSON.stringify(role.parsed || { title: role.title, company: role.company }, null, 2),
      GAP_ANALYSIS: JSON.stringify(gapAnalysis, null, 2),
    })

    const resumeResponse = await callLLMWithRetry([
      { role: 'system', content: SYSTEM_PROMPTS.SAFETY + '\n' + SYSTEM_PROMPTS.ATS_SAFE },
      { role: 'user', content: resumePrompt },
    ], 2, { temperature: 0.5, maxTokens: 3000 })

    let resumeContent: z.infer<typeof ResumeContentSchema> | null = null
    try {
      resumeContent = parseLLMJson(resumeResponse.content, ResumeContentSchema, 'object')
    } catch (error) {
      console.error('Failed to parse tailored resume:', error)
    }

    // Step 3: Generate cover letter
    const letterPrompt = fillTemplate(COVER_LETTER_PROMPT, {
      RESUME: JSON.stringify(resumeContent, null, 2),
      ROLE: JSON.stringify({ title: role.title, company: role.company, parsed: role.parsed }, null, 2),
      TONE: profile?.tone_default || 'professional',
    })

    const letterResponse = await callLLMWithRetry([
      { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
      { role: 'user', content: letterPrompt },
    ], 2, { temperature: 0.6, maxTokens: 1500 })

    let letterContent: z.infer<typeof CoverLetterContentSchema> | null = null
    try {
      letterContent = parseLLMJson(letterResponse.content, CoverLetterContentSchema, 'object')
    } catch (error) {
      console.error('Failed to parse cover letter:', error)
    }

    // Step 4: Generate follow-ups
    const followupPrompt = fillTemplate(FOLLOWUP_PROMPT, {
      ROLE: JSON.stringify({ title: role.title, company: role.company }, null, 2),
      STAGE: 'after_apply',
      TONE: profile?.tone_default || 'professional',
    })

    const followupResponse = await callLLMWithRetry([
      { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
      { role: 'user', content: followupPrompt },
    ], 2, { temperature: 0.6, maxTokens: 1000 })

    let followups: z.infer<typeof FollowUpArraySchema> = []
    try {
      followups = parseLLMJson(followupResponse.content, FollowUpArraySchema, 'array')
    } catch (error) {
      console.error('Failed to parse follow-up templates:', error)
    }

    // Save documents to database
    if (resumeContent) {
      await supabase.from('documents').insert({
        user_id: user.id,
        role_id: roleId,
        type: 'resume',
        title: `${role.company} - ${role.title} Resume`,
        source: 'tailored',
        content: resumeContent,
        version: 1,
      })
    }

    if (letterContent) {
      await supabase.from('documents').insert({
        user_id: user.id,
        role_id: roleId,
        type: 'cover_letter',
        title: `${role.company} - ${role.title} Cover Letter`,
        source: 'tailored',
        content: letterContent,
        version: 1,
      })
    }

    // Update application with match score
    if (application && gapAnalysis.matchScore) {
      await supabase
        .from('applications')
        .update({ match_score: gapAnalysis.matchScore })
        .eq('id', application.id)
    }

    // Persist follow-up templates in activity notes when the column exists.
    if (application && followups.length > 0) {
      try {
        const existingNotes = Array.isArray(application.activity_notes) ? application.activity_notes : []
        const updatedNotes = [
          ...existingNotes.filter((entry: any) => entry?.type !== 'generated_followups'),
          {
            type: 'generated_followups',
            generatedAt: new Date().toISOString(),
            items: followups,
          },
        ]
        await supabase
          .from('applications')
          .update({ activity_notes: updatedNotes })
          .eq('id', application.id)
      } catch (error) {
        console.error('Could not persist follow-up templates:', error)
      }
    }

    return NextResponse.json(
      {
        success: true,
        resume: resumeContent,
        coverLetter: letterContent,
        followups,
        matchScore: gapAnalysis.matchScore,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Generate pack error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate pack' },
      { status: 500 }
    )
  }
}
