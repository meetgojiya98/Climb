import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { HORIZON_EXPANSION_PROMPT, SYSTEM_PROMPTS, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'

const LaneSchema = z.enum([
  'network',
  'branding',
  'role-intel',
  'interview',
  'compensation',
  'automation',
  'governance',
])

const RequestSchema = z.object({
  ambition: z.string().min(8).max(600).optional(),
  operatingMode: z.enum(['solo', 'coach', 'team']).optional(),
  horizonWeeks: z.number().min(8).max(20).optional(),
  riskTolerance: z.number().min(0).max(100).optional(),
  lanes: z.array(LaneSchema).min(1).max(5).optional(),
})

const HorizonExpansionSchema = z.object({
  expansionName: z.string().min(6).max(120),
  summary: z.string().min(24).max(2600),
  northStar: z.object({
    goal: z.string().min(6).max(200),
    target: z.string().min(6).max(200),
    metric: z.string().min(6).max(180),
  }),
  horizons: z
    .array(
      z.object({
        horizon: z.enum(['H1', 'H2', 'H3']),
        window: z.string().min(4).max(60),
        objective: z.string().min(8).max(220),
        initiatives: z.array(z.string().min(6).max(220)).min(3).max(5),
        modules: z.array(z.string().min(5).max(120)).min(3).max(5),
        kpiCheckpoints: z.array(z.string().min(5).max(180)).min(2).max(4),
      })
    )
    .length(3),
  featurePods: z
    .array(
      z.object({
        name: z.string().min(4).max(100),
        value: z.string().min(8).max(220),
        owner: z.string().min(2).max(80),
        launchWindow: z.string().min(3).max(60),
        moduleHref: z.string().min(5).max(120),
      })
    )
    .min(4)
    .max(6),
  executionCadence: z
    .array(
      z.object({
        day: z.string().min(2).max(20),
        focus: z.string().min(4).max(120),
        action: z.string().min(6).max(220),
        moduleHref: z.string().min(5).max(120),
      })
    )
    .min(5)
    .max(7),
  automationBacklog: z
    .array(
      z.object({
        name: z.string().min(4).max(100),
        trigger: z.string().min(6).max(180),
        impact: z.string().min(8).max(220),
        href: z.string().min(5).max(120),
      })
    )
    .min(3)
    .max(5),
  quickPrompts: z.array(z.string().min(3).max(150)).min(4).max(8),
  confidence: z.number().min(0).max(1),
})

type Lane = z.infer<typeof LaneSchema>
type HorizonExpansion = z.infer<typeof HorizonExpansionSchema>

function safeHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/horizons'
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function lanePods(mode: string): Record<Lane, { name: string; value: string; owner: string; href: string }> {
  const owner = mode === 'team' ? 'Program Office' : mode === 'coach' ? 'Coach + Candidate' : 'Candidate'
  return {
    network: {
      name: 'Opportunity Radar Pod',
      value: 'Expand outbound and inbound opportunity coverage with pipeline-safe intake.',
      owner,
      href: '/app/saved-jobs',
    },
    branding: {
      name: 'Brand Narrative Pod',
      value: 'Strengthen positioning consistency across resume variants and application assets.',
      owner,
      href: '/app/resumes',
    },
    'role-intel': {
      name: 'Role Intelligence Pod',
      value: 'Scale structured role parsing and fit-gap closure before execution.',
      owner,
      href: '/app/roles',
    },
    interview: {
      name: 'Interview Conversion Pod',
      value: 'Increase interview-to-offer conversion with AI-guided drills and scoring loops.',
      owner,
      href: '/app/interviews',
    },
    compensation: {
      name: 'Compensation Strategy Pod',
      value: 'Improve compensation readiness and decision quality on offer scenarios.',
      owner,
      href: '/app/salary-insights',
    },
    automation: {
      name: 'Execution Autopilot Pod',
      value: 'Automate recurring prioritization, risk checks, and weekly review workflows.',
      owner,
      href: '/app/command-center',
    },
    governance: {
      name: 'Governance Scorecard Pod',
      value: 'Institutionalize KPI ownership and weekly decision loops across modules.',
      owner: mode === 'team' ? 'Program Office' : owner,
      href: '/app/program-office',
    },
  }
}

function buildFallbackExpansion(context: Record<string, any>): HorizonExpansion {
  const request = context.request || {}
  const metrics = context.metrics || {}
  const horizonWeeks = Number(request.horizonWeeks || 12)
  const lanes = (request.lanes || ['role-intel', 'branding', 'automation', 'governance']) as Lane[]
  const operatingMode = String(request.operatingMode || 'solo')
  const podsMap = lanePods(operatingMode)
  const uniqueLanes = Array.from(new Set(lanes))
  const selectedLanes = uniqueLanes.length >= 4
    ? uniqueLanes.slice(0, 5)
    : Array.from(
        new Set([
          ...uniqueLanes,
          'role-intel',
          'branding',
          'automation',
          'governance',
        ])
      ).slice(0, 5) as Lane[]

  const features = selectedLanes.map((lane, index) => ({
    name: podsMap[lane].name,
    value: podsMap[lane].value,
    owner: podsMap[lane].owner,
    launchWindow: index < 2 ? 'H1' : index < 4 ? 'H2' : 'H3',
    moduleHref: podsMap[lane].href,
  }))

  const responseRate = Math.round(Number(metrics.responseRate || 0))
  const interviewRate = Math.round(Number(metrics.interviewRate || 0))
  const offerRate = Math.round(Number(metrics.offerRate || 0))
  const projectedOffers = Number(metrics.projectedOffers || 0)
  const targetOffers = Math.max(2, projectedOffers + 2)
  const recommendedWeekly = Math.max(5, Number(metrics.recommendedWeeklyTarget || 6))

  return {
    expansionName: 'Multi-Horizon Horizontal Expansion Plan',
    summary: [
      `This plan scales your Climb operating model horizontally over ${horizonWeeks} weeks by activating new capability pods beyond core application tracking.`,
      `H1 stabilizes execution and role intelligence, H2 expands conversion and compensation readiness, and H3 institutionalizes governance and automation for sustained scale.`,
      `Current baseline is ${metrics.totalApplications || 0} applications, ${responseRate}% response rate, ${interviewRate}% interview rate, and ${offerRate}% offer rate.`,
      `Use this plan as a feature-operating roadmap: launch pods, track KPI checkpoints weekly, and rebalance priorities using forecast signals.`,
    ].join(' '),
    northStar: {
      goal: 'Run Climb as a multi-lane operating system with reliable conversion and governance.',
      target: `Reach >= ${targetOffers} projected offers and sustain ${recommendedWeekly}+ applications/week by the end of horizon.`,
      metric: 'Projected offers, response rate, role-intelligence coverage, and SLA compliance.',
    },
    horizons: [
      {
        horizon: 'H1',
        window: 'Weeks 1-4',
        objective: 'Stabilize foundations and launch highest-impact expansion pods.',
        initiatives: [
          'Launch role-intelligence and brand-narrative pods with weekly ownership',
          'Clear stale and overdue pipeline debt before scaling throughput',
          'Deploy AI mission cadence for daily prioritization and risk control',
        ],
        modules: ['/app/roles', '/app/resumes', '/app/control-tower', '/app/horizons'],
        kpiCheckpoints: [
          `Role parsing coverage >= ${Math.max(80, Math.round(Number(metrics.parsingCoverage || 0) + 20))}%`,
          `ATS baseline >= ${Math.max(78, Math.round(Number(metrics.avgATS || 70) + 5))}%`,
          `Overdue follow-ups <= ${Math.max(0, Number(metrics.overdue || 0) - 3)}`,
        ],
      },
      {
        horizon: 'H2',
        window: 'Weeks 5-8',
        objective: 'Scale conversion quality and broaden feature-lane execution.',
        initiatives: [
          'Launch interview-conversion and compensation pods with measurable outcomes',
          'Link role targeting decisions directly to resume-variant changes',
          'Establish weekly conversion experiments across response and interview stages',
        ],
        modules: ['/app/interviews', '/app/salary-insights', '/app/forecast', '/app/applications'],
        kpiCheckpoints: [
          `Response rate >= ${Math.max(25, responseRate + 4)}%`,
          `Interview rate >= ${Math.max(12, interviewRate + 3)}%`,
          `Projected offers (${Math.min(8, horizonWeeks)}w) >= ${Math.max(1, projectedOffers + 1)}`,
        ],
      },
      {
        horizon: 'H3',
        window: `Weeks 9-${horizonWeeks}`,
        objective: 'Institutionalize horizontal scale with governance and automation.',
        initiatives: [
          'Launch governance and automation pods for durable execution discipline',
          'Adopt weekly executive review loop with decision logging and KPI ownership',
          'Create quarterly-ready feature expansion scorecard across all active pods',
        ],
        modules: ['/app/program-office', '/app/command-center', '/app/reports', '/app/help'],
        kpiCheckpoints: [
          'Weekly governance review completion = 100%',
          `Applications/week >= ${recommendedWeekly}`,
          `Projected offers (${horizonWeeks}w) >= ${targetOffers}`,
        ],
      },
    ],
    featurePods: features.slice(0, 6),
    executionCadence: [
      {
        day: 'Monday',
        focus: 'Pod Prioritization',
        action: 'Set weekly priorities for all active pods and assign execution owners.',
        moduleHref: '/app/horizons',
      },
      {
        day: 'Tuesday',
        focus: 'Role + Brand Lift',
        action: 'Run role-intelligence updates and resume-brand alignment tasks.',
        moduleHref: '/app/roles',
      },
      {
        day: 'Wednesday',
        focus: 'Pipeline Throughput',
        action: 'Execute applications, follow-up actions, and stale-risk recovery.',
        moduleHref: '/app/control-tower',
      },
      {
        day: 'Thursday',
        focus: 'Conversion Loop',
        action: 'Run interview and compensation readiness actions for active opportunities.',
        moduleHref: '/app/interviews',
      },
      {
        day: 'Friday',
        focus: 'Forecast + Governance',
        action: 'Review KPI movement, forecast trajectory, and next-week expansion priorities.',
        moduleHref: '/app/program-office',
      },
    ],
    automationBacklog: [
      {
        name: 'Daily Pod Pulse',
        trigger: 'Start of each working day',
        impact: 'Keeps multi-lane execution focused and prevents priority drift.',
        href: '/app/horizons',
      },
      {
        name: 'Midweek Risk Sweep',
        trigger: 'Wednesday noon',
        impact: 'Reduces stale records and missed follow-up windows before week-end.',
        href: '/app/control-tower',
      },
      {
        name: 'Friday Expansion Review',
        trigger: 'Weekly close-out',
        impact: 'Converts KPI movement into explicit pod-priority decisions.',
        href: '/app/program-office',
      },
      {
        name: 'Forecast Rebalance Trigger',
        trigger: 'When projected offers drop below threshold',
        impact: 'Automatically prioritizes recovery actions across relevant lanes.',
        href: '/app/forecast',
      },
    ],
    quickPrompts: [
      'Which expansion pod should I launch next based on current risk?',
      'Create a 2-week rollout plan for my top 3 pods.',
      'How do I increase response and interview rates with horizontal expansion?',
      'Convert this expansion plan into a mobile-first daily checklist.',
      'Generate a weekly governance brief for pod performance.',
      'What should I deprioritize to protect execution quality?',
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

    const usage = await consumeAIUsageQuota(supabase, user.id, 'horizon-expansion-plan')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for horizon expansion planning',
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
      ambition = 'Expand Climb horizontally into multiple execution horizons with measurable outcomes.',
      operatingMode = 'solo',
      horizonWeeks = 12,
      riskTolerance = 55,
      lanes = ['role-intel', 'branding', 'automation', 'governance'] as Lane[],
    } = RequestSchema.parse(body)

    const [applications, resumesResult, rolesResult, goalsResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('roles').select('id, parsed').eq('user_id', user.id),
      supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
    ])

    const resumes = resumesResult.data || []
    const roles = rolesResult.data || []
    const goals = goalsResult.data || []
    const parsedRoles = roles.filter((role: any) => role.parsed && typeof role.parsed === 'object').length
    const parsingCoverage = roles.length > 0 ? (parsedRoles / roles.length) * 100 : 0
    const overdue = applications.filter((app: any) => {
      if (!['applied', 'screening', 'interview'].includes(String(app.status || ''))) return false
      const date = new Date(app.next_action_at || app.follow_up_date || '')
      return Number.isFinite(date.getTime()) && date < new Date()
    }).length

    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((score: number) => Number.isFinite(score))
    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, score: number) => sum + score, 0) / atsValues.length
      : 70

    const responseCount = applications.filter((app: any) =>
      ['screening', 'interview', 'offer'].includes(String(app.status || ''))
    ).length
    const interviewCount = applications.filter((app: any) => String(app.status || '') === 'interview').length
    const offerCount = applications.filter((app: any) => String(app.status || '') === 'offer').length
    const forecastMetrics = deriveForecastMetrics(applications)
    const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
    const projection = projectPipeline({
      applicationsPerWeek: recommendedWeeklyTarget,
      weeks: Math.min(12, horizonWeeks),
      responseRate: forecastMetrics.responseRate,
      interviewRate: forecastMetrics.interviewRate,
      offerRate: forecastMetrics.offerRate,
      qualityLiftPct: 6,
    })

    const context = {
      request: {
        ambition,
        operatingMode,
        horizonWeeks,
        riskTolerance,
        lanes,
      },
      metrics: {
        totalApplications: applications.length,
        responseRate: Number(pct(responseCount, applications.length).toFixed(1)),
        interviewRate: Number(pct(interviewCount, applications.length).toFixed(1)),
        offerRate: Number(pct(offerCount, applications.length).toFixed(1)),
        projectedOffers: projection.expectedOffers,
        recommendedWeeklyTarget,
        totalResumes: resumes.length,
        avgATS: Number(avgATS.toFixed(1)),
        totalRoles: roles.length,
        parsedRoles,
        parsingCoverage: Number(parsingCoverage.toFixed(1)),
        totalGoals: goals.length,
        goalsCompleted: goals.filter((goal: any) => goal.completed).length,
        overdue,
      },
      generatedAt: new Date().toISOString(),
    }

    let expansion = buildFallbackExpansion(context)

    try {
      const prompt = fillTemplate(HORIZON_EXPANSION_PROMPT, {
        HORIZON_CONTEXT: JSON.stringify(context, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          {
            role: 'system',
            content: `${SYSTEM_PROMPTS.SAFETY}\nKeep recommendations measurable, execution-ready, and limited to valid Climb modules.`,
          },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1900 }
      )

      const parsed = parseLLMJson(response.content, HorizonExpansionSchema, 'object')
      expansion = {
        ...parsed,
        horizons: parsed.horizons.map((item) => ({
          ...item,
          modules: item.modules.map((module) => safeHref(module)),
        })),
        featurePods: parsed.featurePods.map((pod) => ({
          ...pod,
          moduleHref: safeHref(pod.moduleHref),
        })),
        executionCadence: parsed.executionCadence.map((cadence) => ({
          ...cadence,
          moduleHref: safeHref(cadence.moduleHref),
        })),
        automationBacklog: parsed.automationBacklog.map((item) => ({
          ...item,
          href: safeHref(item.href),
        })),
      }
    } catch (error) {
      console.error('Horizon expansion fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        expansion,
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Horizon expansion route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid horizon expansion request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate horizon expansion plan' },
      { status: 500 }
    )
  }
}
