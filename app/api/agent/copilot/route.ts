import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api-contract'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { SYSTEM_PROMPTS, COPILOT_ORCHESTRATOR_PROMPT, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'

const RequestSchema = z.object({
  message: z.string().min(2).max(1200),
  surface: z
    .enum([
      'global',
      'dashboard',
      'applications',
      'help',
      'control-tower',
      'program-office',
      'command-center',
      'forecast',
      'horizons',
      'resumes',
      'roles',
      'interviews',
    ])
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(1200),
      })
    )
    .max(8)
    .optional()
    .default([]),
})

const CopilotActionSchema = z.object({
  title: z.string().min(3).max(90),
  detail: z.string().min(8).max(280),
  href: z.string().min(5),
  priority: z.enum(['high', 'medium', 'low']),
})

const CopilotResponseSchema = z.object({
  answer: z.string().min(20).max(2200),
  summary: z.string().min(8).max(220),
  actionPlan: z.array(CopilotActionSchema).min(3).max(5),
  quickReplies: z.array(z.string().min(2).max(60)).min(2).max(6),
  confidence: z.number().min(0).max(1),
})

type CopilotResponse = z.infer<typeof CopilotResponseSchema>

const RECOVERY_HREF = '/app/command-center'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function sanitizeHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/dashboard'
}

function sanitizeCopilotResponse(raw: CopilotResponse): CopilotResponse {
  const actionPlan = raw.actionPlan.map((action) => ({
    ...action,
    href: sanitizeHref(action.href),
  }))

  const hasHighPriority = actionPlan.some((action) => action.priority === 'high')
  if (!hasHighPriority && actionPlan.length > 0) {
    actionPlan[0] = { ...actionPlan[0], priority: 'high' }
  }

  return {
    ...raw,
    actionPlan,
  }
}

function buildFallbackResponse(
  message: string,
  surface:
    | 'global'
    | 'dashboard'
    | 'applications'
    | 'help'
    | 'control-tower'
    | 'program-office'
    | 'command-center'
    | 'forecast'
    | 'horizons'
    | 'resumes'
    | 'roles'
    | 'interviews',
  snapshot: Record<string, any>
): CopilotResponse {
  const metrics = snapshot.metrics || {}
  const goals = snapshot.goals || {}
  const weekly = snapshot.weekly || {}
  const quality = snapshot.quality || {}
  const forecast = snapshot.forecast || {}
  const roles = snapshot.roles || {}
  const horizons = snapshot.horizons || {}

  const actions: Array<z.infer<typeof CopilotActionSchema>> = []

  if (metrics.overdueFollowups > 0) {
    actions.push({
      title: `Recover ${metrics.overdueFollowups} overdue follow-up${metrics.overdueFollowups > 1 ? 's' : ''}`,
      detail: 'Clear overdue records first to restore SLA reliability and avoid pipeline decay.',
      href: '/app/control-tower',
      priority: 'high',
    })
  }

  if (metrics.noActionRecords > 0) {
    actions.push({
      title: `Set next actions on ${metrics.noActionRecords} records`,
      detail: 'Assign follow-up dates to all active opportunities so weekly execution stays predictable.',
      href: '/app/applications',
      priority: 'high',
    })
  }

  if (quality.avgATS < 75) {
    actions.push({
      title: 'Lift resume quality baseline',
      detail: `Average ATS is ${Math.round(quality.avgATS)}. Raise weak resumes above 75 to improve response quality.`,
      href: '/app/resumes',
      priority: 'medium',
    })
  }

  if (surface === 'roles') {
    if (roles.unparsed > 0) {
      actions.push({
        title: `Parse ${roles.unparsed} role${roles.unparsed > 1 ? 's' : ''} still unstructured`,
        detail: 'Convert unparsed role records into structured requirement data before next application sprint.',
        href: '/app/roles',
        priority: 'high',
      })
    }

    if (Array.isArray(roles.topMissingKeywords) && roles.topMissingKeywords.length > 0) {
      actions.push({
        title: `Close role-fit gap: ${String(roles.topMissingKeywords[0])}`,
        detail: 'Update resume variants to cover high-frequency role keywords and improve fit quality.',
        href: '/app/resumes',
        priority: 'high',
      })
    }

    if ((roles.addedThisWeek || 0) < 4) {
      actions.push({
        title: 'Increase weekly role intake depth',
        detail: 'Add and prioritize more high-fit roles this week to stabilize top-of-funnel quality.',
        href: '/app/roles/new',
        priority: 'medium',
      })
    }
  }

  if (surface === 'horizons') {
    if (horizons.expansionReadiness < 70) {
      actions.push({
        title: `Raise expansion readiness (${horizons.expansionReadiness} -> 75+)`,
        detail: 'Stabilize quality, role-intel coverage, and operating cadence before launching new feature pods.',
        href: '/app/horizons',
        priority: 'high',
      })
    }

    actions.push({
      title: 'Launch multi-horizon expansion plan',
      detail: 'Generate and execute an H1-H3 rollout with KPI checkpoints and pod ownership.',
      href: '/app/horizons',
      priority: 'high',
    })

    if ((horizons.activePods || 0) < 4) {
      actions.push({
        title: `Activate additional feature pods (current: ${horizons.activePods || 0})`,
        detail: 'Expand beyond core modules by enabling network, brand, interview, and automation lanes.',
        href: '/app/ai-studio',
        priority: 'medium',
      })
    }
  }

  if (surface === 'forecast') {
    actions.push({
      title: 'Lock a balanced forecast baseline',
      detail: `Set weekly target near ${forecast.recommendedWeeklyTarget} and validate offer projection before changing execution volume.`,
      href: '/app/forecast',
      priority: 'high',
    })
  }

  if (forecast.projectedOffers8w < 1) {
    actions.push({
      title: 'Run a forecast recovery plan',
      detail: `Current 8-week projection is ${forecast.projectedOffers8w} offers. Increase weekly volume and quality lift assumptions.`,
      href: '/app/forecast',
      priority: 'high',
    })
  }

  if (goals.dueSoon > 0) {
    actions.push({
      title: `Stabilize ${goals.dueSoon} goal${goals.dueSoon > 1 ? 's' : ''} due soon`,
      detail: 'Break upcoming goals into weekly deliverables and attach ownership for each milestone.',
      href: '/app/goals',
      priority: 'medium',
    })
  }

  if (actions.length < 3) {
    actions.push(
      {
        title: 'Run command-center risk review',
        detail: 'Use the enterprise command center to prioritize the highest-impact operational fixes this week.',
        href: RECOVERY_HREF,
        priority: 'high',
      },
      {
        title: 'Execute weekly operating playbook',
        detail: 'Follow the guided cadence to align role intake, application production, and reporting.',
        href: '/app/help',
        priority: 'medium',
      },
      {
        title: 'Publish a weekly executive report',
        detail: 'Convert operating metrics into decisions and track movement across key conversion levers.',
        href: '/app/reports',
        priority: 'low',
      }
    )
  }

  const actionPlan = actions.slice(0, 5)
  if (!actionPlan.some((action) => action.priority === 'high')) {
    actionPlan[0] = { ...actionPlan[0], priority: 'high' }
  }

  const topic = message.toLowerCase()
  const quickReplies = (surface === 'forecast'
    ? [
        'Compare conservative vs aggressive forecast scenarios',
        'What weekly target gives me at least 2 projected offers?',
        'How much quality lift is realistic in the next 4 weeks?',
        'Create a mobile-first weekly forecast review checklist',
        'Turn this forecast into a 7-day execution plan',
      ]
    : surface === 'roles'
    ? [
        'Which roles should I prioritize this week?',
        'Build a role-intake and parsing sprint for 5 days',
        'How do I close the highest keyword fit gaps quickly?',
        'Create a role targeting checklist for mobile and desktop',
        'How should I map role priorities to resume variants?',
      ]
    : surface === 'horizons'
    ? [
        'Generate a 3-horizon expansion plan for this quarter',
        'Which feature pods should I launch first?',
        'Create a weekly operating cadence for horizontal expansion',
        'How do I scale without hurting conversion quality?',
        'Turn expansion strategy into a mobile-friendly checklist',
      ]
    : [
        'What should I prioritize this week?',
        'Give me a 7-day execution plan',
        'How do I improve response rate fastest?',
        'Create a mobile-friendly daily checklist',
        topic.includes('interview') ? 'Build an interview sprint plan' : 'Help me prepare for interviews',
      ]).slice(0, 6)

  const summary = surface === 'forecast'
    ? `Forecast: ${forecast.projectedOffers8w} projected offers in 8 weeks at ${forecast.recommendedWeeklyTarget}/week with current ${metrics.responseRate}% response rate.`
    : surface === 'roles'
    ? `Roles: ${roles.total || 0} tracked, ${roles.parsed || 0} parsed, ${roles.unparsed || 0} unparsed, and ${roles.addedThisWeek || 0} added in 7 days.`
    : surface === 'horizons'
    ? `Horizons: readiness ${horizons.expansionReadiness || 0}, active pods ${horizons.activePods || 0}, projected offers ${forecast.projectedOffers8w} in 8 weeks.`
    : `Pipeline: ${metrics.totalApplications} apps, ${metrics.responseRate}% response, ${metrics.interviewRate}% interview, ${forecast.projectedOffers8w} projected offers in 8 weeks.`

  const answer = [
    `Here is your enterprise AI operating brief for the ${surface} workspace.`,
    `Current baseline: ${metrics.totalApplications} total applications, ${weekly.applicationsThisWeek} this week, and ${metrics.activeApplications} active records. Forecast projects ${forecast.projectedOffers8w} offers over the next 8 weeks at ${forecast.recommendedWeeklyTarget} applications per week.`,
    surface === 'roles'
      ? `Role intake status: ${roles.total || 0} total roles, ${roles.parsed || 0} parsed, ${roles.unparsed || 0} unparsed, and ${roles.addedThisWeek || 0} added in the last 7 days.`
      : '',
    surface === 'horizons'
      ? `Horizontal scale baseline: ${horizons.activePods || 0} active pods with expansion readiness at ${horizons.expansionReadiness || 0}. Use H1/H2/H3 sequencing and KPI checkpoints to avoid execution drag.`
      : '',
    `Primary risk signals are overdue follow-ups (${metrics.overdueFollowups}), stale records (${metrics.staleRecords}), and missing next-action dates (${metrics.noActionRecords}). Remove these blockers first, then lift ATS quality and weekly submission cadence.`,
    `Use the action plan below in order. Execute high-priority items within 48 hours and run a forecast check at the end of the week.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    answer,
    summary,
    actionPlan,
    quickReplies,
    confidence: 0.58,
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

    const usage = await consumeAIUsageQuota(supabase, user.id, 'copilot-chat')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for copilot chat',
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

    const { message, surface = 'global', history } = await parseJsonBody(request, RequestSchema)

    const [
      applications,
      resumesResult,
      goalsResult,
      sessionsResult,
      rolesResult,
      skillsResult,
    ] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase
        .from('resumes')
        .select('id, ats_score, updated_at')
        .eq('user_id', user.id),
      supabase
        .from('career_goals')
        .select('id, completed, target_date')
        .eq('user_id', user.id),
      supabase
        .from('interview_sessions')
        .select('score, questions_answered, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('roles')
        .select('id, parsed, created_at')
        .eq('user_id', user.id)
        .limit(120),
      supabase
        .from('skills')
        .select('name')
        .eq('user_id', user.id)
        .limit(240),
    ])

    const resumes = resumesResult.data || []
    const goals = goalsResult.data || []
    const sessions = sessionsResult.data || []
    const roles = rolesResult.data || []
    const skills = skillsResult.data || []

    const now = new Date()
    const today = startOfDay(now)
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const activeStatuses = new Set(['applied', 'screening', 'interview'])
    const activeApplications = applications.filter((app: any) => activeStatuses.has(String(app.status || '')))

    const overdueFollowups = activeApplications.filter((app: any) => {
      const due = app.next_action_at || app.follow_up_date
      if (!due) return false
      const dueDate = new Date(due)
      return Number.isFinite(dueDate.getTime()) && startOfDay(dueDate) < today
    }).length

    const staleRecords = activeApplications.filter((app: any) => {
      if (app.next_action_at || app.follow_up_date) return false
      const date = app.applied_date || app.created_at
      if (!date) return false
      const d = new Date(date)
      if (!Number.isFinite(d.getTime())) return false
      const ageDays = Math.floor((today.getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24))
      return ageDays >= 14
    }).length

    const noActionRecords = activeApplications.filter((app: any) => !app.next_action_at && !app.follow_up_date).length
    const applicationsThisWeek = applications.filter((app: any) => {
      const date = app.applied_date || app.created_at
      if (!date) return false
      const d = new Date(date)
      return Number.isFinite(d.getTime()) && d >= weekAgo
    }).length

    const forecastMetrics = deriveForecastMetrics(applications)
    const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
    const projection8w = projectPipeline({
      applicationsPerWeek: recommendedWeeklyTarget,
      weeks: 8,
      responseRate: forecastMetrics.responseRate,
      interviewRate: forecastMetrics.interviewRate,
      offerRate: forecastMetrics.offerRate,
      qualityLiftPct: 5,
    })

    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((value: number) => Number.isFinite(value))
    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
      : 0

    const goalsDueSoon = goals.filter((goal: any) => {
      if (goal.completed || !goal.target_date) return false
      const targetDate = new Date(goal.target_date)
      if (!Number.isFinite(targetDate.getTime())) return false
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 10
    }).length

    const parsedRoles = roles.filter((role: any) => role.parsed && typeof role.parsed === 'object').length
    const rolesAddedThisWeek = roles.filter((role: any) => {
      const created = new Date(role.created_at || '')
      return Number.isFinite(created.getTime()) && created >= weekAgo
    }).length
    const interviewAvgScore = sessions.length > 0
      ? sessions.reduce((sum: number, session: any) => sum + Number(session.score || 0), 0) / sessions.length
      : 0

    const skillSet = new Set(
      (skills || [])
        .map((item: any) => String(item.name || '').trim().toLowerCase())
        .filter(Boolean)
    )
    const keywordCounts: Record<string, number> = {}
    roles.forEach((role: any) => {
      const parsed = role?.parsed
      const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : []
      keywords.forEach((keyword: any) => {
        const normalized = String(keyword || '').trim().toLowerCase()
        if (!normalized) return
        keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1
      })
    })
    const topMissingKeywords = Object.entries(keywordCounts)
      .filter(([keyword]) => !skillSet.has(keyword))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([keyword]) => keyword)

    const expansionReadiness = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          Number(avgATS || 0) * 0.4 +
            Number(parsedRoles || 0) / Math.max(1, roles.length) * 100 * 0.25 +
            Math.max(0, 100 - overdueFollowups * 8 - noActionRecords * 6) * 0.2 +
            Math.min(100, applicationsThisWeek * 10) * 0.15
        )
      )
    )
    const activePods = [
      resumes.length > 0,
      roles.length > 0,
      applications.length > 0,
      sessions.length > 0,
      goals.length > 0,
      forecastMetrics.avgApplicationsPerWeek > 0,
    ].filter(Boolean).length

    const contextSnapshot = {
      surface,
      user: {
        firstName: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User',
        plan: usage.plan,
      },
      metrics: {
        totalApplications: applications.length,
        activeApplications: activeApplications.length,
        responseRate: Math.round(forecastMetrics.responseRate),
        interviewRate: Math.round(forecastMetrics.interviewRate),
        offerRate: Math.round(forecastMetrics.offerRate),
        overdueFollowups,
        staleRecords,
        noActionRecords,
      },
      quality: {
        resumes: resumes.length,
        avgATS: Number(avgATS.toFixed(1)),
        parsedRoles,
        interviewAvgScore: Number(interviewAvgScore.toFixed(1)),
      },
      roles: {
        total: roles.length,
        parsed: parsedRoles,
        unparsed: Math.max(0, roles.length - parsedRoles),
        addedThisWeek: rolesAddedThisWeek,
        topMissingKeywords,
      },
      horizons: {
        expansionReadiness,
        activePods,
      },
      goals: {
        total: goals.length,
        completed: goals.filter((goal: any) => goal.completed).length,
        dueSoon: goalsDueSoon,
      },
      weekly: {
        applicationsThisWeek,
      },
      forecast: {
        recommendedWeeklyTarget,
        projectedResponses8w: projection8w.expectedResponses,
        projectedInterviews8w: projection8w.expectedInterviews,
        projectedOffers8w: projection8w.expectedOffers,
      },
      generatedAt: new Date().toISOString(),
    }

    const formattedHistory = history
      .map((item, index) => `${index + 1}. ${item.role.toUpperCase()}: ${item.content}`)
      .join('\n')
    const fallback = buildFallbackResponse(message, surface, contextSnapshot)

    let copilotResponse = fallback

    try {
      const prompt = fillTemplate(COPILOT_ORCHESTRATOR_PROMPT, {
        CONTEXT: JSON.stringify(contextSnapshot, null, 2),
        HISTORY: formattedHistory || 'No prior history',
        MESSAGE: message,
      })

      const llmResponse = await callLLMWithRetry(
        [
          {
            role: 'system',
            content: `${SYSTEM_PROMPTS.SAFETY}\nKeep recommendations factual, non-fabricated, and operational.`,
          },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1600 }
      )

      const parsed = parseLLMJson(llmResponse.content, CopilotResponseSchema, 'object')
      copilotResponse = sanitizeCopilotResponse(parsed)
    } catch (error) {
      console.error('Copilot fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        response: copilotResponse,
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
    console.error('Copilot route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid copilot request payload', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process copilot request' },
      { status: 500 }
    )
  }
}
