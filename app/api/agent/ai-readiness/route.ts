import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

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

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'ai-readiness')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for readiness insights',
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

    const [applications, resumesResult, goalsResult, sessionsResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('career_goals').select('id, completed, target_date').eq('user_id', user.id),
      supabase.from('interview_sessions').select('id, created_at').eq('user_id', user.id),
    ])

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
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
      return date ? date < today : false
    }).length
    const stale = activeApps.filter((app: any) => {
      if (app.next_action_at || app.follow_up_date) return false
      const base = safeDate(app.applied_date || app.created_at)
      if (!base) return false
      const ageDays = Math.floor((today.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
      return ageDays >= 14
    }).length
    const noAction = activeApps.filter((app: any) => !app.next_action_at && !app.follow_up_date).length

    const apps7d = applications.filter((app: any) => {
      const date = safeDate(app.applied_date || app.created_at)
      return date ? date >= weekAgo : false
    }).length

    const resumes = resumesResult.data || []
    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((value: number) => Number.isFinite(value))
    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
      : 68

    const goals = goalsResult.data || []
    const goalsCompleted = goals.filter((goal: any) => goal.completed).length
    const goalsDueSoon = goals.filter((goal: any) => {
      if (goal.completed || !goal.target_date) return false
      const date = safeDate(goal.target_date)
      if (!date) return false
      const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 14
    }).length
    const goalCompletionRate = goals.length > 0 ? pct(goalsCompleted, goals.length) : 0

    const sessions30d = (sessionsResult.data || []).filter((session: any) => {
      const date = safeDate(session.created_at)
      return date ? date >= thirtyDaysAgo : false
    }).length

    const responseRate = applications.length > 0 ? pct(responses, applications.length) : 0
    const interviewRate = applications.length > 0 ? pct(interviews, applications.length) : 0
    const offerRate = applications.length > 0 ? pct(offers, applications.length) : 0

    const orchestration = clamp(
      Math.round(100 - overdue * 10 - stale * 7 - noAction * 5 + Math.min(10, activeApps.length * 1.5)),
      0,
      100
    )
    const quality = clamp(Math.round(avgATS * 0.8 + responseRate * 0.2), 0, 100)
    const velocity = clamp(Math.round((apps7d / 5) * 100), 0, 100)
    const interviewReadiness = clamp(Math.round(Math.min(100, sessions30d * 12) * 0.7 + interviewRate * 0.3), 0, 100)
    const governance = clamp(Math.round(goalCompletionRate * 0.7 + Math.max(0, 100 - goalsDueSoon * 12) * 0.3), 0, 100)

    const dimensions = [
      {
        id: 'orchestration',
        label: 'Orchestration',
        score: orchestration,
        status: orchestration >= 80 ? 'strong' : orchestration >= 60 ? 'stable' : 'at_risk',
        detail: `Overdue ${overdue}, stale ${stale}, no-action ${noAction}.`,
        href: '/app/control-tower',
      },
      {
        id: 'quality',
        label: 'Quality',
        score: quality,
        status: quality >= 80 ? 'strong' : quality >= 60 ? 'stable' : 'at_risk',
        detail: `ATS baseline ${Math.round(avgATS)} with response ${Math.round(responseRate)}%.`,
        href: '/app/resumes',
      },
      {
        id: 'velocity',
        label: 'Velocity',
        score: velocity,
        status: velocity >= 80 ? 'strong' : velocity >= 60 ? 'stable' : 'at_risk',
        detail: `${apps7d} applications in last 7 days (target 5+).`,
        href: '/app/applications',
      },
      {
        id: 'interview',
        label: 'Interview Readiness',
        score: interviewReadiness,
        status: interviewReadiness >= 80 ? 'strong' : interviewReadiness >= 60 ? 'stable' : 'at_risk',
        detail: `${sessions30d} sessions in 30 days; interview rate ${Math.round(interviewRate)}%.`,
        href: '/app/interviews',
      },
      {
        id: 'governance',
        label: 'Governance',
        score: governance,
        status: governance >= 80 ? 'strong' : governance >= 60 ? 'stable' : 'at_risk',
        detail: `${goalsCompleted}/${goals.length} goals complete; ${goalsDueSoon} due soon.`,
        href: '/app/program-office',
      },
    ]

    const overallScore = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)
    const maturityBand = overallScore >= 85
      ? 'Elite'
      : overallScore >= 70
      ? 'Strong'
      : overallScore >= 55
      ? 'Emerging'
      : 'Foundational'

    const recommendations = [
      overdue > 0 && {
        title: 'Clear follow-up debt',
        detail: 'Resolve overdue records first to protect conversion.',
        href: '/app/control-tower',
        priority: 'high',
      },
      apps7d < 5 && {
        title: 'Increase weekly volume',
        detail: 'Raise application throughput to stabilize forecast.',
        href: '/app/applications',
        priority: 'high',
      },
      avgATS < 75 && {
        title: 'Lift resume quality',
        detail: 'Raise ATS baseline to improve response quality.',
        href: '/app/resumes',
        priority: 'medium',
      },
      sessions30d < 4 && {
        title: 'Increase mock interview cadence',
        detail: 'Practice at least 1-2 sessions per week.',
        href: '/app/interviews',
        priority: 'medium',
      },
      goalsDueSoon > 0 && {
        title: 'Re-plan near-term goals',
        detail: 'Break goals into actionable weekly milestones.',
        href: '/app/goals',
        priority: 'medium',
      },
    ].filter(Boolean)

    const recommendedWeeklyTarget = Math.max(5, Math.round(apps7d + 2))

    return NextResponse.json(
      {
        success: true,
        readiness: {
          overallScore,
          maturityBand,
          dimensions,
          recommendations,
          risk: {
            overdue,
            stale,
            noAction,
            goalsDueSoon,
          },
          baseRates: {
            responseRate: Math.round(responseRate || 22),
            interviewRate: Math.round(interviewRate || 9),
            offerRate: Math.round(offerRate || 3),
            recommendedWeeklyTarget,
          },
          updatedAt: new Date().toISOString(),
        },
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('AI readiness route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI readiness insights' },
      { status: 500 }
    )
  }
}
