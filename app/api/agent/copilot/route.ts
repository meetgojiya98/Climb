import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { SYSTEM_PROMPTS, COPILOT_ORCHESTRATOR_PROMPT, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'

const RequestSchema = z.object({
  message: z.string().min(2).max(1200),
  surface: z.enum(['global', 'applications', 'help', 'dashboard']).optional(),
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
  surface: 'global' | 'applications' | 'help' | 'dashboard',
  snapshot: Record<string, any>
): CopilotResponse {
  const metrics = snapshot.metrics || {}
  const goals = snapshot.goals || {}
  const weekly = snapshot.weekly || {}
  const quality = snapshot.quality || {}
  const forecast = snapshot.forecast || {}

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
  const quickReplies = [
    'What should I prioritize this week?',
    'Give me a 7-day execution plan',
    'How do I improve response rate fastest?',
    'Create a mobile-friendly daily checklist',
    topic.includes('interview') ? 'Build an interview sprint plan' : 'Help me prepare for interviews',
  ].slice(0, 6)

  const summary = `Pipeline: ${metrics.totalApplications} apps, ${metrics.responseRate}% response, ${metrics.interviewRate}% interview, ${forecast.projectedOffers8w} projected offers in 8 weeks.`

  const answer = [
    `Here is your enterprise AI operating brief for the ${surface} workspace.`,
    `Current baseline: ${metrics.totalApplications} total applications, ${weekly.applicationsThisWeek} this week, and ${metrics.activeApplications} active records. Forecast projects ${forecast.projectedOffers8w} offers over the next 8 weeks at ${forecast.recommendedWeeklyTarget} applications per week.`,
    `Primary risk signals are overdue follow-ups (${metrics.overdueFollowups}), stale records (${metrics.staleRecords}), and missing next-action dates (${metrics.noActionRecords}). Remove these blockers first, then lift ATS quality and weekly submission cadence.`,
    `Use the action plan below in order. Execute high-priority items within 48 hours and run a forecast check at the end of the week.`,
  ].join('\n\n')

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

    const body = await request.json()
    const { message, surface = 'global', history } = RequestSchema.parse(body)

    const [
      applications,
      resumesResult,
      goalsResult,
      sessionsResult,
      rolesResult,
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
    ])

    const resumes = resumesResult.data || []
    const goals = goalsResult.data || []
    const sessions = sessionsResult.data || []
    const roles = rolesResult.data || []

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
    const interviewAvgScore = sessions.length > 0
      ? sessions.reduce((sum: number, session: any) => sum + Number(session.score || 0), 0) / sessions.length
      : 0

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
