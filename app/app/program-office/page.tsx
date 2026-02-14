import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

type Application = {
  id: string
  company: string | null
  position: string | null
  status: string | null
  applied_date: string | null
  created_at: string | null
  follow_up_date: string | null
  next_action_at: string | null
  match_score: number | null
}

const ACTIVE_STATUSES = new Set(['applied', 'screening', 'interview'])
const RESPONSE_STATUSES = new Set(['screening', 'interview', 'offer'])

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

async function fetchApplications(supabase: any, userId: string): Promise<Application[]> {
  const primary = await supabase
    .from('applications')
    .select('id, company, position, status, applied_date, created_at, follow_up_date, next_action_at, match_score')
    .eq('user_id', userId)

  if (!primary.error) return (primary.data || []) as Application[]

  if (!String(primary.error.message || '').toLowerCase().includes('follow_up_date')) {
    throw primary.error
  }

  const fallback = await supabase
    .from('applications')
    .select('id, company, position, status, applied_date, created_at, next_action_at, match_score')
    .eq('user_id', userId)

  if (fallback.error) throw fallback.error
  return (fallback.data || []).map((row: any) => ({ ...row, follow_up_date: null }))
}

export default async function ProgramOfficePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [applications, resumesResult, goalsResult, sessionsResult, rolesResult] = await Promise.all([
    fetchApplications(supabase, user.id),
    supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
    supabase.from('career_goals').select('id, completed, target_date').eq('user_id', user.id),
    supabase.from('interview_sessions').select('id, score, created_at').eq('user_id', user.id),
    supabase.from('roles').select('id, created_at').eq('user_id', user.id),
  ])

  const allApplications = applications || []
  const resumes = resumesResult.data || []
  const goals = goalsResult.data || []
  const sessions = sessionsResult.data || []
  const roles = rolesResult.data || []

  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activeApps = allApplications.filter((app) => ACTIVE_STATUSES.has(String(app.status || '')))
  const responses = allApplications.filter((app) => RESPONSE_STATUSES.has(String(app.status || ''))).length
  const interviews = allApplications.filter((app) => String(app.status || '') === 'interview').length
  const offers = allApplications.filter((app) => String(app.status || '') === 'offer').length

  const overdue = activeApps.filter((app) => {
    const d = safeDate(app.next_action_at || app.follow_up_date)
    if (!d) return false
    return startOfDay(d) < today
  })

  const stale = activeApps.filter((app) => {
    if (app.next_action_at || app.follow_up_date) return false
    const d = safeDate(app.applied_date || app.created_at)
    if (!d) return false
    const ageDays = Math.floor((today.getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24))
    return ageDays >= 14
  })

  const noAction = activeApps.filter((app) => !app.next_action_at && !app.follow_up_date)

  const recentApplications7d = allApplications.filter((app) => {
    const d = safeDate(app.applied_date || app.created_at)
    return d ? d >= sevenDaysAgo : false
  }).length

  const recentApplications30d = allApplications.filter((app) => {
    const d = safeDate(app.applied_date || app.created_at)
    return d ? d >= thirtyDaysAgo : false
  }).length

  const avgMatch = allApplications
    .map((app) => Number(app.match_score))
    .filter((score) => Number.isFinite(score))
  const avgAts = resumes
    .map((resume) => Number(resume.ats_score))
    .filter((score) => Number.isFinite(score))

  const qualityIndex = Math.round(
    ((avgMatch.length ? avgMatch.reduce((sum, score) => sum + score, 0) / avgMatch.length : 70) +
      (avgAts.length ? avgAts.reduce((sum, score) => sum + score, 0) / avgAts.length : 70)) /
      2
  )

  const goalsCompleted = goals.filter((goal: any) => Boolean(goal.completed)).length
  const goalCompletionRate = pct(goalsCompleted, goals.length)
  const goalsDueSoon = goals.filter((goal: any) => {
    if (goal.completed || !goal.target_date) return false
    const d = safeDate(goal.target_date)
    if (!d) return false
    const diffDays = Math.ceil((startOfDay(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 14
  }).length

  const sessions30d = sessions.filter((session: any) => {
    const d = safeDate(session.created_at)
    return d ? d >= thirtyDaysAgo : false
  }).length

  const activeCount = Math.max(1, activeApps.length)
  const slaCompliance = Math.max(0, Math.round(((activeCount - overdue.length - stale.length) / activeCount) * 100))
  const pipelineEfficiency = Math.round(
    (pct(responses, allApplications.length) + pct(interviews, allApplications.length) + pct(offers, allApplications.length)) / 3
  )

  const monthlyTargetBaseline = Math.max(20, Math.max(1, recentApplications30d))
  const velocityScore = clamp(Math.round((recentApplications30d / monthlyTargetBaseline) * 100), 0, 100)
  const executionScore = clamp(
    Math.round(slaCompliance * 0.35 + qualityIndex * 0.3 + pipelineEfficiency * 0.2 + goalCompletionRate * 0.15),
    0,
    100
  )

  const forecastMetrics = deriveForecastMetrics(allApplications)
  const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
  const scenarios = [
    {
      id: 'conservative',
      label: 'Conservative',
      applicationsPerWeek: Math.max(3, recommendedWeeklyTarget - 2),
      qualityLiftPct: 2,
      note: 'Protect quality while building steady volume.',
    },
    {
      id: 'balanced',
      label: 'Balanced',
      applicationsPerWeek: recommendedWeeklyTarget,
      qualityLiftPct: 6,
      note: 'Default enterprise operating cadence.',
    },
    {
      id: 'aggressive',
      label: 'Aggressive',
      applicationsPerWeek: recommendedWeeklyTarget + 3,
      qualityLiftPct: 10,
      note: 'Push pipeline growth with stronger optimization.',
    },
  ].map((scenario) => ({
    ...scenario,
    projection: projectPipeline({
      applicationsPerWeek: scenario.applicationsPerWeek,
      weeks: 12,
      responseRate: forecastMetrics.responseRate,
      interviewRate: forecastMetrics.interviewRate,
      offerRate: forecastMetrics.offerRate,
      qualityLiftPct: scenario.qualityLiftPct,
    }),
  }))

  const maxScenarioOffers = Math.max(1, ...scenarios.map((scenario) => scenario.projection.expectedOffers))

  const workstreams = [
    {
      title: 'Pipeline Velocity',
      progress: clamp(Math.round((recentApplications30d / Math.max(1, recommendedWeeklyTarget * 4)) * 100), 0, 100),
      detail: `${recentApplications30d} applications in last 30 days.`,
    },
    {
      title: 'Quality Engineering',
      progress: clamp(qualityIndex, 0, 100),
      detail: `Quality index ${qualityIndex} (ATS + role alignment).`,
    },
    {
      title: 'Interview Readiness',
      progress: clamp(Math.round((sessions30d / 8) * 100), 0, 100),
      detail: `${sessions30d} mock sessions completed in 30 days.`,
    },
    {
      title: 'Strategic Goals',
      progress: clamp(goalCompletionRate, 0, 100),
      detail: `${goalsCompleted}/${goals.length} goals completed.`,
    },
  ]

  const governance = [
    {
      title: 'Follow-up SLA',
      detail: `${overdue.length} overdue follow-up item${overdue.length === 1 ? '' : 's'}.`,
      status: overdue.length === 0 ? 'Pass' : 'Risk',
    },
    {
      title: 'Pipeline Hygiene',
      detail: `${noAction.length} active record${noAction.length === 1 ? '' : 's'} without next action.`,
      status: noAction.length <= 2 ? 'Pass' : 'Watch',
    },
    {
      title: 'Stale Opportunity Control',
      detail: `${stale.length} stale active application${stale.length === 1 ? '' : 's'} (14+ days).`,
      status: stale.length === 0 ? 'Pass' : 'Watch',
    },
    {
      title: 'Goal Delivery Window',
      detail: `${goalsDueSoon} goal${goalsDueSoon === 1 ? '' : 's'} due in next 14 days.`,
      status: goalsDueSoon === 0 ? 'Pass' : 'Watch',
    },
  ]

  const topActions = [
    overdue.length > 0 && {
      label: 'Clear overdue follow-ups',
      href: '/app/applications',
      priority: 'Critical',
    },
    stale.length > 0 && {
      label: 'Revive stale opportunities',
      href: '/app/applications',
      priority: 'High',
    },
    qualityIndex < 80 && {
      label: 'Run resume quality uplift sprint',
      href: '/app/resumes',
      priority: 'High',
    },
    sessions30d < 4 && {
      label: 'Increase interview practice cadence',
      href: '/app/interviews',
      priority: 'Medium',
    },
    goalsDueSoon > 0 && {
      label: 'Break goals into weekly milestones',
      href: '/app/goals',
      priority: 'Medium',
    },
  ].filter(Boolean) as Array<{ label: string; href: string; priority: 'Critical' | 'High' | 'Medium' }>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Program Office</h1>
          <p className="text-muted-foreground">Enterprise planning, governance, and execution orchestration in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/control-tower" className="btn-outline">
            <ShieldCheck className="h-4 w-4" />
            Control Tower
          </Link>
          <Link href="/app/reports" className="btn-saffron">
            <ArrowRight className="h-4 w-4" />
            Executive Reports
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Execution Score</span>
            <Gauge className="h-4 w-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold">{executionScore}</div>
          <p className="text-xs text-muted-foreground mt-2">Cross-functional enterprise score</p>
        </div>
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Velocity Score</span>
            <TrendingUp className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{velocityScore}</div>
          <p className="text-xs text-muted-foreground mt-2">{recentApplications7d} applications in 7 days</p>
        </div>
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>SLA Compliance</span>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{slaCompliance}%</div>
          <p className="text-xs text-muted-foreground mt-2">Active pipeline operating discipline</p>
        </div>
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Quality Index</span>
            <Target className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{qualityIndex}</div>
          <p className="text-xs text-muted-foreground mt-2">Resume quality + role match blend</p>
        </div>
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Coverage</span>
            <Briefcase className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{roles.length}</div>
          <p className="text-xs text-muted-foreground mt-2">{activeApps.length} active applications</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">12-Week Scenario Envelope</h2>
            <span className="text-xs text-muted-foreground">{recommendedWeeklyTarget}/week recommended target</span>
          </div>
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <div key={scenario.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{scenario.label}</span>
                  <span className="text-muted-foreground">
                    {scenario.projection.totalApplications} apps • {scenario.projection.expectedOffers} offers
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-saffron-500"
                    style={{ width: `${Math.min(100, (scenario.projection.expectedOffers / maxScenarioOffers) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{scenario.note}</p>
              </div>
            ))}
          </div>
          <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open forecast planner
            <LineChart className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Action Stack</h2>
          {topActions.length === 0 ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-5 text-sm text-green-700">
              No critical actions right now. Maintain current cadence.
            </div>
          ) : (
            <div className="space-y-2">
              {topActions.map((action, index) => (
                <Link key={`${action.label}-${index}`} href={action.href} className="block rounded-xl border border-border p-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{action.label}</p>
                    <span className={`text-xs font-medium ${action.priority === 'Critical' ? 'text-red-500' : action.priority === 'High' ? 'text-saffron-600' : 'text-navy-600'}`}>
                      {action.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link href="/app/command-center" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open command center
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="h-4 w-4 text-navy-600" />
            <h2 className="font-semibold">Workstream Progress</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {workstreams.map((item) => (
              <div key={item.title} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">{item.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-navy-600" style={{ width: `${item.progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Governance Controls</h2>
          <div className="space-y-3 text-sm">
            {governance.map((item) => (
              <div key={item.title} className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span className={`text-xs font-medium ${item.status === 'Pass' ? 'text-green-600' : item.status === 'Risk' ? 'text-red-500' : 'text-saffron-600'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1 text-xs">Pipeline Conversion</p>
              <p className="font-semibold">
                {pct(responses, allApplications.length)}% response • {pct(interviews, allApplications.length)}% interview • {pct(offers, allApplications.length)}% offer
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-saffron-500" />
          <h2 className="font-semibold">Enterprise Execution Rhythm</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
          <div className="rounded-xl bg-secondary/50 p-4">Monday: refresh role priorities and weekly application slate.</div>
          <div className="rounded-xl bg-secondary/50 p-4">Tuesday: clear all follow-up debt and outreach tasks.</div>
          <div className="rounded-xl bg-secondary/50 p-4">Wednesday: run ATS optimization on top target resumes.</div>
          <div className="rounded-xl bg-secondary/50 p-4">Friday: publish KPI snapshot and reset next-week commitments.</div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-saffron-500/10 px-3 py-2 text-sm text-saffron-700">
          <Sparkles className="h-4 w-4" />
          Repeatable cadence is the fastest path to predictable outcomes.
        </div>
      </div>
    </div>
  )
}
