import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { AI_TRANSFORMATION_PROMPT, SYSTEM_PROMPTS, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'

const FocusAreaSchema = z.enum(['velocity', 'quality', 'control', 'interview', 'governance', 'forecast'])

const RequestSchema = z.object({
  intent: z.string().min(6).max(600).optional(),
  operatingMode: z.enum(['solo', 'coach', 'team']).optional(),
  horizonWeeks: z.number().min(8).max(16).optional(),
  riskTolerance: z.number().min(0).max(100).optional(),
  focusAreas: z.array(FocusAreaSchema).min(1).max(4).optional(),
})

const TransformationSchema = z.object({
  transformationName: z.string().min(6).max(120),
  summary: z.string().min(24).max(2400),
  northStar: z.object({
    goal: z.string().min(6).max(180),
    target: z.string().min(6).max(180),
    metric: z.string().min(6).max(180),
  }),
  pillars: z
    .array(
      z.object({
        title: z.string().min(4).max(90),
        owner: z.string().min(2).max(80),
        outcome: z.string().min(8).max(220),
        moduleHref: z.string().min(5),
        initiatives: z.array(z.string().min(5).max(220)).min(3).max(5),
      })
    )
    .min(3)
    .max(5),
  roadmap: z
    .array(
      z.object({
        window: z.string().min(4).max(60),
        objective: z.string().min(8).max(220),
        actions: z.array(z.string().min(6).max(220)).min(3).max(5),
        kpis: z.array(z.string().min(5).max(160)).min(2).max(4),
      })
    )
    .length(3),
  automations: z
    .array(
      z.object({
        name: z.string().min(4).max(90),
        trigger: z.string().min(6).max(160),
        action: z.string().min(8).max(220),
        impact: z.string().min(8).max(180),
        href: z.string().min(5),
      })
    )
    .min(3)
    .max(5),
  guardrails: z
    .array(
      z.object({
        risk: z.string().min(6).max(160),
        mitigation: z.string().min(8).max(220),
        owner: z.string().min(2).max(80),
        metric: z.string().min(5).max(160),
      })
    )
    .min(3)
    .max(5),
  quickPrompts: z.array(z.string().min(3).max(120)).min(4).max(8),
  confidence: z.number().min(0).max(1),
})

type FocusArea = z.infer<typeof FocusAreaSchema>
type TransformationPlan = z.infer<typeof TransformationSchema>

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function safeAppHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/ai-studio'
}

function focusEnabled(focusAreas: FocusArea[], target: FocusArea): boolean {
  return focusAreas.includes(target)
}

function buildFallbackPlan(context: Record<string, any>): TransformationPlan {
  const mode = String(context.request?.operatingMode || 'solo')
  const modeLabel = mode === 'team' ? 'Team' : mode === 'coach' ? 'Coach-Led' : 'Solo'
  const riskTolerance = Number(context.request?.riskTolerance || 55)
  const horizonWeeks = Number(context.request?.horizonWeeks || 12)
  const focusAreas = (context.request?.focusAreas || ['velocity', 'quality', 'control']) as FocusArea[]
  const forecast = context.forecast || {}
  const metrics = context.metrics || {}

  const focusSummary = focusAreas.join(', ')
  const riskPosture = riskTolerance >= 70 ? 'growth-biased' : riskTolerance >= 40 ? 'balanced' : 'risk-first'
  const thirdStart = Math.max(7, Math.min(horizonWeeks, 7))

  const pillars = [
    {
      title: 'AI Pipeline Control',
      owner: mode === 'team' ? 'Operations Lead' : 'Candidate',
      outcome: `Reduce overdue follow-up debt (${metrics.overdue || 0}) and stale records (${metrics.stale || 0}) within the first cycle.`,
      moduleHref: '/app/control-tower',
      initiatives: [
        'Enforce next-action date on every active record',
        'Run a daily risk queue review and clear critical items first',
        'Escalate stale opportunities into recovery or close decisions',
      ],
    },
    {
      title: 'Quality and Interview Engine',
      owner: mode === 'coach' ? 'Coach + Candidate' : 'Candidate',
      outcome: `Lift ATS baseline (${metrics.avgATS || 68}) and interview consistency with AI-guided practice.`,
      moduleHref: '/app/resumes',
      initiatives: [
        'Run weekly resume quality uplift sprint on weak sections',
        'Map role keywords to summary and impact bullets',
        'Execute structured interview drills with score review',
      ],
    },
    {
      title: 'Forecast-Driven Execution',
      owner: 'Program Office',
      outcome: `Track toward ${forecast.projectedOffersHorizon || 1} projected offers in ${horizonWeeks} weeks with realistic weekly capacity.`,
      moduleHref: '/app/forecast',
      initiatives: [
        `Operate at ${forecast.recommendedWeeklyTarget || 5}+ applications per week`,
        'Run scenario adjustments every Friday with quality lift assumptions',
        'Use conversion deltas to reallocate effort to top-performing role clusters',
      ],
    },
    {
      title: 'Governance and Decision Loop',
      owner: mode === 'team' ? 'Program Office' : 'Candidate + Advisor',
      outcome: `Institutionalize weekly review cadence with measurable KPI ownership across ${focusSummary}.`,
      moduleHref: '/app/program-office',
      initiatives: [
        'Publish weekly operating brief with priorities and blockers',
        'Review KPI movement against targets before planning next sprint',
        'Create executive-ready report-outs for decision traceability',
      ],
    },
  ]

  const filteredPillars = pillars.filter((pillar) => {
    if (pillar.moduleHref === '/app/forecast') return focusEnabled(focusAreas, 'forecast') || focusEnabled(focusAreas, 'velocity')
    if (pillar.moduleHref === '/app/resumes') return focusEnabled(focusAreas, 'quality') || focusEnabled(focusAreas, 'interview')
    if (pillar.moduleHref === '/app/program-office') return focusEnabled(focusAreas, 'governance')
    return true
  })

  const normalizedPillars = (filteredPillars.length >= 3 ? filteredPillars : pillars).slice(0, 5)

  return {
    transformationName: `${modeLabel} AI Operating Upgrade`,
    summary: [
      `This ${modeLabel.toLowerCase()} transformation plan sets a ${riskPosture} AI operating model across the next ${horizonWeeks} weeks.`,
      `Primary focus areas are ${focusSummary}. The plan starts with control and hygiene recovery, then scales quality and interview conversion, and closes with governance-led forecasting.`,
      `Execution discipline is anchored on weekly KPI reviews, AI-generated tactical plans, and device-aware workflows for mobile, iPad, and desktop.`,
    ].join(' '),
    northStar: {
      goal: 'Build a repeatable AI-first operating system for job search execution.',
      target: `Reach ${forecast.projectedOffersHorizon || 1} projected offers in ${horizonWeeks} weeks while keeping SLA and quality trends stable.`,
      metric: 'Projected offers, SLA compliance, ATS baseline, and weekly execution volume.',
    },
    pillars: normalizedPillars,
    roadmap: [
      {
        window: 'Weeks 1-2',
        objective: 'Stabilize control systems and remove operational debt.',
        actions: [
          'Clear all overdue follow-ups and assign next-action dates to active records',
          'Establish daily AI brief ritual to prioritize highest-impact tasks',
          'Set explicit weekly volume and quality targets by role cluster',
        ],
        kpis: [
          `Overdue follow-ups <= ${Math.max(0, Math.floor((metrics.overdue || 0) / 2))}`,
          `No-action records <= ${Math.max(0, Math.floor((metrics.noAction || 0) / 2))}`,
          `Applications per week >= ${forecast.recommendedWeeklyTarget || 5}`,
        ],
      },
      {
        window: 'Weeks 3-6',
        objective: 'Scale quality and conversion with AI-assisted production.',
        actions: [
          'Run weekly resume and interview improvement sprint with score checkpoints',
          'Prioritize high-fit roles and enforce tailored pack generation',
          'Apply forecast scenario comparisons to improve conversion assumptions',
        ],
        kpis: [
          `ATS baseline >= ${Math.max(75, Math.round((metrics.avgATS || 68) + 5))}`,
          `Response rate >= ${Math.max(22, Math.round((metrics.responseRate || 0) + 3))}%`,
          `Interview sessions (30d) >= ${Math.max(4, metrics.sessions30d || 0)}`,
        ],
      },
      {
        window: `Weeks ${thirdStart}-${horizonWeeks}`,
        objective: 'Institutionalize governance and executive decision cadence.',
        actions: [
          'Publish weekly program-office scorecard with ownership and risks',
          'Execute Friday forecast review and rebalance next-week allocation',
          'Generate executive reporting package with actioned decisions',
        ],
        kpis: [
          `Projected offers (${horizonWeeks}w) >= ${Math.max(1, forecast.projectedOffersHorizon || 1)}`,
          `Goal completion rate >= ${Math.max(60, Math.round(metrics.goalCompletionRate || 0))}%`,
          'Weekly decision review completed on schedule',
        ],
      },
    ],
    automations: [
      {
        name: 'Daily AI Priority Brief',
        trigger: 'Every morning before execution starts',
        action: 'Generate top actions across control tower, applications, and forecast surfaces.',
        impact: 'Reduces context-switching and preserves daily execution focus.',
        href: '/app/dashboard',
      },
      {
        name: 'Control Tower Recovery Sweep',
        trigger: 'Twice daily risk checks',
        action: 'Flag overdue, stale, and no-action records for immediate remediation.',
        impact: 'Improves SLA compliance and prevents pipeline decay.',
        href: '/app/control-tower',
      },
      {
        name: 'Weekly Forecast Autopilot',
        trigger: 'Friday operating review',
        action: 'Run scenario simulation and recommend next-week volume/quality targets.',
        impact: 'Maintains forecast predictability and keeps targets realistic.',
        href: '/app/forecast',
      },
      {
        name: 'Governance Report Pack',
        trigger: 'End of weekly cycle',
        action: 'Generate leadership-ready summary with KPI movement and corrective actions.',
        impact: 'Enables traceable decisions and faster strategic adjustments.',
        href: '/app/reports',
      },
    ],
    guardrails: [
      {
        risk: 'AI output over-optimizes volume and reduces quality.',
        mitigation: 'Pair every volume increase with ATS and match-score quality checks.',
        owner: 'Program Office',
        metric: 'Weekly ATS baseline and response rate trend.',
      },
      {
        risk: 'Follow-up debt accumulates and hurts conversion.',
        mitigation: 'Enforce daily control-tower recovery blocks with explicit ownership.',
        owner: 'Operations Lead',
        metric: 'Overdue and no-action record count.',
      },
      {
        risk: 'Interview readiness lags behind application growth.',
        mitigation: 'Require weekly interview drills with AI score progression tracking.',
        owner: 'Candidate',
        metric: 'Interview practice sessions and score trend.',
      },
      {
        risk: 'Governance cadence breaks on mobile-heavy weeks.',
        mitigation: 'Use mobile quick updates daily and reserve iPad/desktop for weekly reviews.',
        owner: 'Candidate + Coach',
        metric: 'Weekly review completion and KPI checkpoint log.',
      },
    ],
    quickPrompts: [
      'Generate today\'s AI operating priorities from this transformation plan.',
      'Which guardrail is most at risk this week and how should I recover?',
      'Create a 5-day mobile-first execution sequence from this roadmap.',
      'Rewrite this plan for leadership update format with KPI highlights.',
      'What should I automate first to improve forecast confidence?',
      'Create a week-by-week checklist for the next sprint.',
    ],
    confidence: 0.66,
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

    const usage = await consumeAIUsageQuota(supabase, user.id, 'ai-transformation-plan')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for transformation planning',
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
      intent = 'Deploy an enterprise AI operating system that improves conversion predictability and execution discipline.',
      operatingMode = 'solo',
      horizonWeeks = 12,
      riskTolerance = 55,
      focusAreas = ['velocity', 'quality', 'control'] as FocusArea[],
    } = RequestSchema.parse(body)

    const [applications, resumesResult, goalsResult, sessionsResult, rolesResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('career_goals').select('id, completed, target_date').eq('user_id', user.id),
      supabase.from('interview_sessions').select('id, score, created_at').eq('user_id', user.id),
      supabase.from('roles').select('id, parsed').eq('user_id', user.id),
    ])

    const now = new Date()
    const today = startOfDay(now)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeStatuses = new Set(['applied', 'screening', 'interview'])
    const activeApps = applications.filter((app: any) => activeStatuses.has(String(app.status || '')))
    const responses = applications.filter((app: any) =>
      ['screening', 'interview', 'offer'].includes(String(app.status || ''))
    ).length
    const interviews = applications.filter((app: any) => String(app.status || '') === 'interview').length
    const offers = applications.filter((app: any) => String(app.status || '') === 'offer').length

    const overdue = activeApps.filter((app: any) => {
      const date = safeDate(app.next_action_at || app.follow_up_date)
      return date ? startOfDay(date) < today : false
    }).length

    const stale = activeApps.filter((app: any) => {
      if (app.next_action_at || app.follow_up_date) return false
      const base = safeDate(app.applied_date || app.created_at)
      if (!base) return false
      const ageDays = Math.floor((today.getTime() - startOfDay(base).getTime()) / (1000 * 60 * 60 * 24))
      return ageDays >= 14
    }).length

    const noAction = activeApps.filter((app: any) => !app.next_action_at && !app.follow_up_date).length

    const applications7d = applications.filter((app: any) => {
      const date = safeDate(app.applied_date || app.created_at)
      return date ? date >= sevenDaysAgo : false
    }).length

    const resumes = resumesResult.data || []
    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((value: number) => Number.isFinite(value))
    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
      : 68

    const goals = goalsResult.data || []
    const goalsCompleted = goals.filter((goal: any) => Boolean(goal.completed)).length
    const goalsDueSoon = goals.filter((goal: any) => {
      if (goal.completed || !goal.target_date) return false
      const date = safeDate(goal.target_date)
      if (!date) return false
      const diffDays = Math.ceil((startOfDay(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 14
    }).length
    const goalCompletionRate = goals.length > 0 ? pct(goalsCompleted, goals.length) : 0

    const sessions30d = (sessionsResult.data || []).filter((session: any) => {
      const date = safeDate(session.created_at)
      return date ? date >= thirtyDaysAgo : false
    })
    const avgInterviewScore = sessions30d.length > 0
      ? sessions30d.reduce((sum: number, session: any) => sum + Number(session.score || 0), 0) / sessions30d.length
      : 0

    const parsedRoles = (rolesResult.data || []).filter((role: any) => role.parsed && typeof role.parsed === 'object').length

    const responseRate = applications.length > 0 ? pct(responses, applications.length) : 0
    const interviewRate = applications.length > 0 ? pct(interviews, applications.length) : 0
    const offerRate = applications.length > 0 ? pct(offers, applications.length) : 0

    const forecastMetrics = deriveForecastMetrics(applications)
    const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
    const qualityLiftPct = clamp(Math.round(4 + riskTolerance / 12), 2, 14)
    const projection = projectPipeline({
      applicationsPerWeek: recommendedWeeklyTarget,
      weeks: horizonWeeks,
      responseRate: forecastMetrics.responseRate,
      interviewRate: forecastMetrics.interviewRate,
      offerRate: forecastMetrics.offerRate,
      qualityLiftPct,
    })

    const contextSnapshot = {
      request: {
        intent,
        operatingMode,
        horizonWeeks,
        riskTolerance,
        focusAreas,
      },
      user: {
        firstName: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User',
        plan: usage.plan,
      },
      metrics: {
        totalApplications: applications.length,
        activeApplications: activeApps.length,
        applications7d,
        responseRate: Math.round(responseRate),
        interviewRate: Math.round(interviewRate),
        offerRate: Math.round(offerRate),
        overdue,
        stale,
        noAction,
        avgATS: Number(avgATS.toFixed(1)),
        goalsTotal: goals.length,
        goalsCompleted,
        goalsDueSoon,
        goalCompletionRate: Math.round(goalCompletionRate),
        sessions30d: sessions30d.length,
        avgInterviewScore: Number(avgInterviewScore.toFixed(1)),
        parsedRoles,
      },
      forecast: {
        recommendedWeeklyTarget,
        projectedResponsesHorizon: projection.expectedResponses,
        projectedInterviewsHorizon: projection.expectedInterviews,
        projectedOffersHorizon: projection.expectedOffers,
        qualityLiftPct,
      },
      generatedAt: new Date().toISOString(),
    }

    const fallback = buildFallbackPlan(contextSnapshot)
    let plan = fallback

    try {
      const prompt = fillTemplate(AI_TRANSFORMATION_PROMPT, {
        TRANSFORMATION_CONTEXT: JSON.stringify(contextSnapshot, null, 2),
      })

      const llmResponse = await callLLMWithRetry(
        [
          {
            role: 'system',
            content: `${SYSTEM_PROMPTS.SAFETY}\nKeep output strategic, practical, and grounded in provided metrics only.`,
          },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 2100 }
      )

      const parsed = parseLLMJson(llmResponse.content, TransformationSchema, 'object')
      plan = {
        ...parsed,
        pillars: parsed.pillars.map((pillar) => ({
          ...pillar,
          moduleHref: safeAppHref(pillar.moduleHref),
          initiatives: pillar.initiatives.slice(0, 5),
        })),
        automations: parsed.automations.map((item) => ({
          ...item,
          href: safeAppHref(item.href),
        })),
      }
    } catch (error) {
      console.error('AI transformation fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        plan: {
          ...plan,
          generatedAt: new Date().toISOString(),
        },
        usage: {
          plan: usage.plan,
          remaining: usage.remaining,
          limit: usage.limit,
          resetAt: usage.resetAt,
        },
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('AI transformation route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid transformation request payload', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate AI transformation plan' },
      { status: 500 }
    )
  }
}
