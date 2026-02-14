import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { RESUME_PORTFOLIO_PLAN_PROMPT, SYSTEM_PROMPTS, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const PrioritySchema = z.enum(['quality', 'coverage', 'targeting', 'conversion'])

const RequestSchema = z.object({
  objective: z.string().min(8).max(500).optional(),
  targetRole: z.string().min(2).max(140).optional(),
  horizonWeeks: z.number().min(4).max(16).optional(),
  weeklyHours: z.number().min(3).max(24).optional(),
  priority: PrioritySchema.optional(),
})

const PortfolioPlanSchema = z.object({
  overview: z.string().min(20).max(2600),
  northStar: z.object({
    goal: z.string().min(6).max(200),
    target: z.string().min(6).max(200),
    metric: z.string().min(6).max(180),
  }),
  tracks: z
    .array(
      z.object({
        title: z.string().min(4).max(100),
        objective: z.string().min(8).max(220),
        targetRoles: z.array(z.string().min(2).max(100)).min(2).max(5),
        resumeMoves: z.array(z.string().min(6).max(200)).min(3).max(5),
        proofSignals: z.array(z.string().min(4).max(160)).min(2).max(4),
        moduleHref: z.string().min(5),
      })
    )
    .min(3)
    .max(4),
  kpis: z
    .array(
      z.object({
        name: z.string().min(2).max(90),
        target: z.string().min(1).max(120),
        current: z.string().min(1).max(120),
        owner: z.string().min(2).max(70),
        why: z.string().min(8).max(200),
      })
    )
    .min(4)
    .max(6),
  weeklyCadence: z
    .array(
      z.object({
        day: z.string().min(2).max(20),
        focus: z.string().min(4).max(120),
        action: z.string().min(6).max(220),
        moduleHref: z.string().min(5),
      })
    )
    .min(5)
    .max(7),
  aiPrompts: z.array(z.string().min(4).max(180)).min(4).max(8),
  confidence: z.number().min(0).max(1),
})

type PortfolioPlan = z.infer<typeof PortfolioPlanSchema>

function safeHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/resumes'
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function cleanText(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function topTargetRoles(resumes: Array<any>, limit: number): string[] {
  const counts: Record<string, number> = {}
  resumes.forEach((resume) => {
    const role = cleanText(resume?.target_role)
    if (!role) return
    const key = role.toLowerCase()
    counts[key] = (counts[key] || 0) + 1
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([role]) => titleCase(role))
}

function topRoleKeywords(roles: Array<any>, limit: number): string[] {
  const counts: Record<string, number> = {}

  roles.forEach((role) => {
    const parsed = role?.parsed as any
    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : []
    keywords.forEach((keyword: any) => {
      const normalized = cleanText(String(keyword || '')).toLowerCase()
      if (!normalized || normalized.length < 2) return
      counts[normalized] = (counts[normalized] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => titleCase(keyword))
}

function buildFallbackPlan(context: Record<string, any>): PortfolioPlan {
  const request = context.request || {}
  const metrics = context.metrics || {}
  const horizonWeeks = Number(request.horizonWeeks || 8)
  const weeklyHours = Number(request.weeklyHours || 8)
  const priority = String(request.priority || 'quality')
  const targetRole = cleanText(request.targetRole)
  const topRoles = Array.isArray(metrics.topTargetRoles) && metrics.topTargetRoles.length > 0
    ? metrics.topTargetRoles
    : ['Product Manager', 'Program Manager', 'Operations Lead']
  const topKeywords = Array.isArray(metrics.topKeywords) && metrics.topKeywords.length > 0
    ? metrics.topKeywords
    : ['Stakeholder Communication', 'Execution Discipline', 'Data Storytelling']

  const primaryRole = targetRole || topRoles[0] || 'Primary Role'
  const adjacentRole = topRoles[1] || 'Adjacent Role'
  const stretchRole = topRoles[2] || 'Stretch Role'
  const avgATS = Math.round(Number(metrics.avgATS || 68))
  const responseRate = Math.round(Number(metrics.responseRate || 0))
  const recommendedWeeklyVolume = Math.max(5, Number(metrics.recommendedWeeklyVolume || 6))

  const focusLine =
    priority === 'coverage'
      ? 'increase role-family coverage with structured variants'
      : priority === 'targeting'
      ? 'tighten role-fit targeting and keyword evidence'
      : priority === 'conversion'
      ? 'convert stronger resume quality into better response outcomes'
      : 'raise resume quality baseline and evidence depth'

  return {
    overview: [
      `This resume portfolio plan is built for a ${horizonWeeks}-week window at ${weeklyHours} hours per week.`,
      `Primary focus is to ${focusLine} while keeping ATS-safe quality standards and measurable execution cadence.`,
      `Current baseline is ${metrics.totalResumes || 0} resumes, ${avgATS}% average ATS, and ${responseRate}% response rate.`,
      `The operating pattern is: define tracks, execute weekly resume upgrades, and measure conversion movement every Friday.`,
    ].join(' '),
    northStar: {
      goal: 'Build a role-aligned resume portfolio that is conversion-ready and governance-friendly.',
      target: `Maintain 3 active resume tracks and reach >= ${Math.max(80, avgATS + 6)} ATS average within ${horizonWeeks} weeks.`,
      metric: 'ATS baseline, role coverage, and response-rate movement by track.',
    },
    tracks: [
      {
        title: 'Core Conversion Track',
        objective: `Optimize the strongest resume variant for ${primaryRole} and high-fit applications.`,
        targetRoles: [primaryRole, `${primaryRole} (Senior)`, `${primaryRole} (Growth)`].slice(0, 3),
        resumeMoves: [
          'Rewrite summary with role-specific scope, ownership, and measurable outcomes',
          'Upgrade top 6 bullets using role language and evidence-backed impact',
          'Re-order skills so high-frequency role requirements appear in first screen view',
          'Build one ATS-safe variant tuned for high-priority role clusters',
        ],
        proofSignals: [topKeywords[0] || 'Execution ownership', topKeywords[1] || 'Cross-functional delivery', 'Outcome metrics'],
        moduleHref: '/app/resumes',
      },
      {
        title: 'Adjacency Expansion Track',
        objective: `Create coverage for adjacent opportunities around ${adjacentRole}.`,
        targetRoles: [adjacentRole, 'Operations Program Manager', 'Strategy & Operations'],
        resumeMoves: [
          'Create adjacency version emphasizing transferable outcomes and collaboration scope',
          'Add domain-specific keywords from parsed roles without overstuffing',
          'Map each project bullet to one target-role requirement',
        ],
        proofSignals: [topKeywords[2] || 'Process optimization', 'Stakeholder alignment', 'Prioritization under constraints'],
        moduleHref: '/app/roles',
      },
      {
        title: 'Offer Acceleration Track',
        objective: `Use a stretch variant for selective high-upside openings around ${stretchRole}.`,
        targetRoles: [stretchRole, 'Strategic Programs', 'Chief of Staff'],
        resumeMoves: [
          'Build a premium variant with stronger leadership and cross-team influence language',
          'Add a clear impact arc in experience bullets: challenge, action, measurable result',
          'Align top achievements with interview narrative checkpoints for consistency',
        ],
        proofSignals: ['Decision quality', 'Execution speed', 'Business impact'],
        moduleHref: '/app/interviews',
      },
    ],
    kpis: [
      {
        name: 'Portfolio Coverage',
        target: '3 active role tracks',
        current: `${metrics.totalResumes || 0} resumes`,
        owner: 'Candidate',
        why: 'Coverage protects pipeline resilience across multiple role families.',
      },
      {
        name: 'ATS Baseline',
        target: `>= ${Math.max(80, avgATS + 6)}%`,
        current: `${avgATS}%`,
        owner: 'Candidate + AI',
        why: 'Higher ATS quality improves initial screening probability.',
      },
      {
        name: 'Weekly Tailored Output',
        target: `${recommendedWeeklyVolume}+ tailored submissions/week`,
        current: `${metrics.applicationsThisWeek || 0} this week`,
        owner: 'Execution Loop',
        why: 'Consistent throughput is required for reliable conversion trends.',
      },
      {
        name: 'Response Rate',
        target: `>= ${Math.max(25, responseRate + 4)}%`,
        current: `${responseRate}%`,
        owner: 'Pipeline Control',
        why: 'Response-rate lift confirms role-fit and message quality improvements.',
      },
    ],
    weeklyCadence: [
      {
        day: 'Monday',
        focus: 'Track Prioritization',
        action: 'Select top roles for each portfolio track and assign this week’s resume updates.',
        moduleHref: '/app/roles',
      },
      {
        day: 'Tuesday',
        focus: 'Core Variant Upgrade',
        action: 'Run AI-assisted summary and bullet upgrades on the core conversion resume.',
        moduleHref: '/app/resumes',
      },
      {
        day: 'Wednesday',
        focus: 'Adjacency Build',
        action: 'Create or refine the adjacency track variant using parsed role requirements.',
        moduleHref: '/app/resumes',
      },
      {
        day: 'Thursday',
        focus: 'Conversion Alignment',
        action: 'Sync resume claims with interview stories and remove weak or unsupported language.',
        moduleHref: '/app/interviews',
      },
      {
        day: 'Friday',
        focus: 'KPI Review',
        action: 'Review ATS and response movement, then lock next-week role and resume priorities.',
        moduleHref: '/app/forecast',
      },
    ],
    aiPrompts: [
      'Create this week\'s resume track priorities from my latest role pipeline.',
      'Which 5 bullets should I rewrite first for maximum response-rate lift?',
      'Generate an adjacency resume version without fabricating any claims.',
      'Audit this resume against target role keywords and highlight the highest-impact gaps.',
      'Design a Friday KPI review checklist for resume portfolio governance.',
      'Turn this portfolio strategy into a daily mobile-friendly execution checklist.',
    ],
    confidence: 0.64,
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

    const usage = await consumeAIUsageQuota(supabase, user.id, 'resume-portfolio-plan')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for resume portfolio planning',
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

    const body = await request.json().catch(() => ({}))
    const {
      objective = 'Build an enterprise resume portfolio that improves role-fit and conversion consistency.',
      targetRole,
      horizonWeeks = 8,
      weeklyHours = 8,
      priority = 'quality',
    } = RequestSchema.parse(body)

    const [applications, resumesResult, rolesResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase
        .from('resumes')
        .select('id, title, target_role, status, ats_score, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('roles')
        .select('id, title, parsed, created_at')
        .eq('user_id', user.id)
        .limit(140),
    ])

    const resumes = resumesResult.data || []
    const roles = rolesResult.data || []

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((value: number) => Number.isFinite(value))

    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
      : 68

    const lowAtsCount = atsValues.filter((value: number) => value < 75).length
    const topRoles = topTargetRoles(resumes, 4)
    const topKeywords = topRoleKeywords(roles, 6)

    const responseCount = applications.filter((app: any) =>
      ['screening', 'interview', 'offer'].includes(String(app.status || ''))
    ).length
    const interviewCount = applications.filter((app: any) => String(app.status || '') === 'interview').length
    const offerCount = applications.filter((app: any) => String(app.status || '') === 'offer').length
    const applicationsThisWeek = applications.filter((app: any) => {
      const date = safeDate(app.applied_date || app.created_at)
      return date ? date >= weekAgo : false
    }).length

    const parsedRoles = roles.filter((role: any) => role.parsed && typeof role.parsed === 'object').length

    const contextSnapshot = {
      request: {
        objective,
        targetRole: targetRole || null,
        horizonWeeks,
        weeklyHours,
        priority,
      },
      metrics: {
        totalResumes: resumes.length,
        completeResumes: resumes.filter((resume: any) => String(resume.status || '') === 'complete').length,
        draftResumes: resumes.filter((resume: any) => String(resume.status || '') === 'draft').length,
        avgATS: Number(avgATS.toFixed(1)),
        lowAtsCount,
        totalRoles: roles.length,
        parsedRoles,
        unparsedRoles: Math.max(0, roles.length - parsedRoles),
        topTargetRoles: topRoles,
        topKeywords,
        totalApplications: applications.length,
        applicationsThisWeek,
        responseRate: Number(pct(responseCount, applications.length).toFixed(1)),
        interviewRate: Number(pct(interviewCount, applications.length).toFixed(1)),
        offerRate: Number(pct(offerCount, applications.length).toFixed(1)),
        recommendedWeeklyVolume: Math.max(5, applicationsThisWeek + 2),
      },
      generatedAt: new Date().toISOString(),
    }

    let plan = buildFallbackPlan(contextSnapshot)

    try {
      const prompt = fillTemplate(RESUME_PORTFOLIO_PLAN_PROMPT, {
        RESUME_PORTFOLIO_CONTEXT: JSON.stringify(contextSnapshot, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          {
            role: 'system',
            content: `${SYSTEM_PROMPTS.SAFETY}\n${SYSTEM_PROMPTS.ATS_SAFE}\nKeep recommendations practical, role-specific, and non-fabricated.`,
          },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1900 }
      )

      const parsed = parseLLMJson(response.content, PortfolioPlanSchema, 'object')
      plan = {
        ...parsed,
        tracks: parsed.tracks.map((track) => ({
          ...track,
          moduleHref: safeHref(track.moduleHref),
        })),
        weeklyCadence: parsed.weeklyCadence.map((slot) => ({
          ...slot,
          moduleHref: safeHref(slot.moduleHref),
        })),
      }
    } catch (error) {
      console.error('Resume portfolio fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        plan,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Resume portfolio route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid resume portfolio planning request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate resume portfolio plan' },
      { status: 500 }
    )
  }
}
