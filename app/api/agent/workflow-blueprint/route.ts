import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { SYSTEM_PROMPTS, WORKFLOW_BLUEPRINT_PROMPT, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const RequestSchema = z.object({
  intent: z.string().min(4).max(500).optional(),
  weeklyHours: z.number().min(2).max(80).optional(),
  devices: z.array(z.enum(['mobile', 'ipad', 'desktop'])).max(3).optional(),
})

const BlueprintSchema = z.object({
  overview: z.string().min(20).max(1500),
  phases: z
    .array(
      z.object({
        name: z.string().min(3).max(80),
        goal: z.string().min(8).max(220),
        durationDays: z.number().min(1).max(60),
        owner: z.string().min(2).max(60),
        moduleHref: z.string().min(5),
        playbook: z.array(z.string().min(3).max(180)).min(3).max(5),
        mobileTip: z.string().min(6).max(220),
        ipadTip: z.string().min(6).max(220),
        desktopTip: z.string().min(6).max(220),
      })
    )
    .min(4)
    .max(6),
  kpis: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        target: z.string().min(1).max(80),
        current: z.string().min(1).max(80),
        why: z.string().min(6).max(220),
      })
    )
    .min(4)
    .max(6),
  dailyCadence: z
    .array(
      z.object({
        day: z.string().min(2).max(20),
        focus: z.string().min(4).max(120),
        actions: z.array(z.string().min(3).max(180)).min(2).max(4),
        timeBudget: z.string().min(2).max(40),
      })
    )
    .min(5)
    .max(7),
  quickPrompts: z.array(z.string().min(3).max(120)).min(4).max(8),
  confidence: z.number().min(0).max(1),
})

type Blueprint = z.infer<typeof BlueprintSchema>

const MONDAY_FRIDAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function safeHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/help'
}

function buildFallbackBlueprint(context: Record<string, any>): Blueprint {
  const metrics = context.metrics || {}
  const forecast = context.forecast || {}
  const weeklyHours = Number(context.user?.weeklyHours || 10)

  return {
    overview: `This enterprise workflow blueprint is tuned for ${weeklyHours} hours/week. It prioritizes pipeline discipline first, then quality lift, then forecast-based scaling so your conversion outcomes become predictable.`,
    phases: [
      {
        name: 'Foundation Baseline',
        goal: 'Set one quality baseline resume and define target role stack.',
        durationDays: 5,
        owner: 'Candidate',
        moduleHref: '/app/resumes',
        playbook: [
          'Refresh summary and top bullets for your primary role track',
          'Align skills section to high-frequency role requirements',
          'Store one master resume baseline before tailoring',
        ],
        mobileTip: 'Use mobile for quick profile edits and reminders.',
        ipadTip: 'Review role posting side-by-side with resume content.',
        desktopTip: 'Run full quality pass and ATS checks on desktop.',
      },
      {
        name: 'Pipeline Control',
        goal: 'Eliminate follow-up debt and enforce next-action discipline.',
        durationDays: 7,
        owner: 'Control Tower',
        moduleHref: '/app/control-tower',
        playbook: [
          `Clear overdue follow-ups (${metrics.overdueFollowups || 0}) first`,
          `Assign next action to no-action records (${metrics.noActionRecords || 0})`,
          'Close or update stale opportunities with a clear disposition',
        ],
        mobileTip: 'Use quick follow-up updates between meetings.',
        ipadTip: 'Batch-review risk queue during midday planning.',
        desktopTip: 'Perform weekly SLA governance review on Friday.',
      },
      {
        name: 'Conversion Lift',
        goal: 'Increase response and interview conversion quality.',
        durationDays: 10,
        owner: 'Candidate + AI',
        moduleHref: '/app/interviews',
        playbook: [
          'Run interview practice and apply AI rewrite tips to weak answers',
          'Tailor each application pack for top-priority roles',
          'Track conversion movement weekly and adjust focus areas',
        ],
        mobileTip: 'Run short answer drills and capture coaching notes.',
        ipadTip: 'Review feedback cards and rewrite answers in focused blocks.',
        desktopTip: 'Use long-form practice sessions with score tracking.',
      },
      {
        name: 'Forecast and Governance',
        goal: 'Translate metrics into a weekly execution and reporting loop.',
        durationDays: 7,
        owner: 'Program Office',
        moduleHref: '/app/program-office',
        playbook: [
          `Validate weekly target (${forecast.recommendedWeeklyTarget || 5}/week)`,
          `Review 8-week projection (${forecast.projectedOffers8w || 0} offers)`,
          'Publish action plan and decisions to reports for the next cycle',
        ],
        mobileTip: 'Check KPI status quickly before daily standups.',
        ipadTip: 'Run governance checklist in planning sessions.',
        desktopTip: 'Generate executive-ready report package weekly.',
      },
    ],
    kpis: [
      {
        name: 'Weekly Application Volume',
        target: `${forecast.recommendedWeeklyTarget || 5}+`,
        current: String(metrics.applicationsThisWeek || 0),
        why: 'Sustained top-of-funnel volume protects downstream conversions.',
      },
      {
        name: 'Response Rate',
        target: '25%+',
        current: `${metrics.responseRate || 0}%`,
        why: 'Indicates role-fit and message quality.',
      },
      {
        name: 'SLA Compliance',
        target: '90%+',
        current: metrics.overdueFollowups > 0 ? 'At Risk' : 'Stable',
        why: 'Follow-up discipline prevents avoidable pipeline drop-off.',
      },
      {
        name: '8-Week Offer Projection',
        target: '>= 2',
        current: String(forecast.projectedOffers8w || 0),
        why: 'Keeps execution aligned to strategic outcomes, not just activity.',
      },
    ],
    dailyCadence: MONDAY_FRIDAY.map((day, index) => {
      const patterns = [
        {
          focus: 'Prioritize and Plan',
          actions: ['Review AI brief priorities', 'Select top roles and outreach targets'],
        },
        {
          focus: 'Execute Applications',
          actions: ['Submit high-fit applications', 'Log status and notes in pipeline'],
        },
        {
          focus: 'Quality Lift',
          actions: ['Run resume/interview AI improvements', 'Update weak sections with proof-based impact'],
        },
        {
          focus: 'Pipeline Governance',
          actions: ['Clear follow-up debt', 'Refresh next-action dates and owners'],
        },
        {
          focus: 'Forecast and Review',
          actions: ['Review KPI shifts and projection', 'Set next-week action commitments'],
        },
      ]
      return {
        day,
        focus: patterns[index].focus,
        actions: patterns[index].actions,
        timeBudget: `${Math.max(1, Math.round(weeklyHours / 5))}h`,
      }
    }),
    quickPrompts: [
      'Give me a Monday priority brief for this week',
      'What should I fix first in control tower today?',
      'How can I improve response rate this week?',
      'Create a 30-minute mobile execution block',
      'Prepare Friday forecast review checklist',
      'Generate next-week governance agenda',
    ],
    confidence: 0.61,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const usage = await consumeAIUsageQuota(supabase, user.id, 'workflow-blueprint')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for workflow blueprint',
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
    const { intent, weeklyHours = 10, devices = ['desktop', 'mobile'] } = RequestSchema.parse(body)

    const [applications, resumesResult, goalsResult, sessionsResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
      supabase.from('interview_sessions').select('id, score').eq('user_id', user.id),
    ])

    const activeStatuses = new Set(['applied', 'screening', 'interview'])
    const activeApps = applications.filter((app: any) => activeStatuses.has(String(app.status || '')))
    const overdueFollowups = activeApps.filter((app: any) => {
      const date = new Date(app.next_action_at || app.follow_up_date || '')
      return Number.isFinite(date.getTime()) && date < new Date()
    }).length
    const noActionRecords = activeApps.filter((app: any) => !app.next_action_at && !app.follow_up_date).length
    const applicationsThisWeek = applications.filter((app: any) => {
      const d = new Date(app.applied_date || app.created_at || '')
      if (!Number.isFinite(d.getTime())) return false
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return d >= weekAgo
    }).length

    const responseCount = applications.filter((app: any) =>
      ['screening', 'interview', 'offer'].includes(String(app.status || ''))
    ).length
    const responseRate = applications.length > 0 ? Math.round((responseCount / applications.length) * 100) : 0
    const interviewRate = applications.length > 0
      ? Math.round((applications.filter((app: any) => app.status === 'interview').length / applications.length) * 100)
      : 0
    const offerRate = applications.length > 0
      ? Math.round((applications.filter((app: any) => app.status === 'offer').length / applications.length) * 100)
      : 0

    const metricsContext = {
      user: {
        intent: intent || 'Build a high-discipline enterprise operating flow',
        weeklyHours,
        devices,
      },
      metrics: {
        totalApplications: applications.length,
        activeApplications: activeApps.length,
        applicationsThisWeek,
        responseRate,
        interviewRate,
        offerRate,
        overdueFollowups,
        noActionRecords,
        resumes: (resumesResult.data || []).length,
        goals: (goalsResult.data || []).length,
        goalsCompleted: (goalsResult.data || []).filter((goal: any) => goal.completed).length,
        interviewSessions: (sessionsResult.data || []).length,
      },
      forecast: {
        recommendedWeeklyTarget: Math.max(5, applicationsThisWeek + 2),
        projectedOffers8w: Math.max(0, Math.round(((offerRate || 2) / 100) * Math.max(8, (applicationsThisWeek || 3) * 8))),
      },
      generatedAt: new Date().toISOString(),
    }

    const fallback = buildFallbackBlueprint(metricsContext)
    let blueprint = fallback

    try {
      const prompt = fillTemplate(WORKFLOW_BLUEPRINT_PROMPT, {
        BLUEPRINT_CONTEXT: JSON.stringify(metricsContext, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1800 }
      )

      const parsed = parseLLMJson(response.content, BlueprintSchema, 'object')
      blueprint = {
        ...parsed,
        phases: parsed.phases.map((phase) => ({
          ...phase,
          moduleHref: safeHref(phase.moduleHref),
        })),
      }
    } catch (error) {
      console.error('Workflow blueprint fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        blueprint,
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
    console.error('Workflow blueprint route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid workflow blueprint request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow blueprint' },
      { status: 500 }
    )
  }
}
