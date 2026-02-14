import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { AIOpsBrief } from '@/components/app/ai-ops-brief'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  BookOpenCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatPct(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

export default async function CommandCenterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
      .select('id, title, ats_score, status, updated_at'),
    supabase
      .from('career_goals')
      .select('id, title, completed, target_date, category'),
    supabase
      .from('interview_sessions')
      .select('score, questions_answered, created_at, category')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('roles')
      .select('id, parsed, created_at'),
    supabase
      .from('skills')
      .select('name'),
  ])

  const resumes = resumesResult.data || []
  const goals = goalsResult.data || []
  const sessions = sessionsResult.data || []
  const roles = rolesResult.data || []
  const skills = (skillsResult.data || []).map((s) => String(s.name || '').toLowerCase())

  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activeApplications = applications.filter(
    (app) => !['offer', 'rejected', 'withdrawn'].includes(String(app.status || ''))
  )
  const interviews = applications.filter((app) => app.status === 'interview').length
  const offers = applications.filter((app) => app.status === 'offer').length

  const overdueFollowups = activeApplications.filter((app) => {
    const dateValue = app.next_action_at || app.follow_up_date
    if (!dateValue) return false
    return startOfDay(new Date(dateValue)) < today
  })

  const staleApplications = activeApplications.filter((app) => {
    if (app.next_action_at || app.follow_up_date) return false
    const dateValue = app.applied_date || app.created_at
    if (!dateValue) return false
    const appDate = startOfDay(new Date(dateValue))
    const ageInDays = Math.floor((today.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))
    return ageInDays >= 14
  })

  const avgMatch = applications
    .filter((app) => typeof app.match_score === 'number')
    .reduce((acc, app, _, arr) => acc + Number(app.match_score || 0) / arr.length, 0)

  const avgATS = resumes
    .filter((resume) => typeof resume.ats_score === 'number')
    .reduce((acc, resume, _, arr) => acc + Number(resume.ats_score || 0) / arr.length, 0)

  const goalsDueSoon = goals.filter((goal) => {
    if (!goal.target_date || goal.completed) return false
    const diffDays = Math.ceil((new Date(goal.target_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 10
  })
  const completedGoals = goals.filter((goal) => goal.completed).length

  const recentApplications7d = applications.filter((app) => {
    const d = app.applied_date || app.created_at
    return d ? new Date(d) >= sevenDaysAgo : false
  }).length

  const recentApplications30d = applications.filter((app) => {
    const d = app.applied_date || app.created_at
    return d ? new Date(d) >= thirtyDaysAgo : false
  }).length

  const responseCount = applications.filter((app) =>
    ['screening', 'interview', 'offer'].includes(String(app.status || ''))
  ).length
  const responseRate = applications.length > 0 ? (responseCount / applications.length) * 100 : 0
  const interviewRate = applications.length > 0 ? (interviews / applications.length) * 100 : 0
  const offerRate = applications.length > 0 ? (offers / applications.length) * 100 : 0
  const forecastMetrics = deriveForecastMetrics(applications)
  const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
  const forecastProjection8w = projectPipeline({
    applicationsPerWeek: recommendedWeeklyTarget,
    weeks: 8,
    responseRate: forecastMetrics.responseRate,
    interviewRate: forecastMetrics.interviewRate,
    offerRate: forecastMetrics.offerRate,
    qualityLiftPct: 5,
  })

  const keywordMentions: Record<string, number> = {}
  roles.forEach((role) => {
    const parsed = role.parsed as any
    const words = Array.isArray(parsed?.keywords) ? parsed.keywords : []
    words.forEach((word: string) => {
      const key = String(word || '').toLowerCase().trim()
      if (!key) return
      keywordMentions[key] = (keywordMentions[key] || 0) + 1
    })
  })

  const topMissingKeywords = Object.entries(keywordMentions)
    .filter(([keyword]) => !skills.includes(keyword))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const opsHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100
          - overdueFollowups.length * 8
          - staleApplications.length * 5
          + Math.min(20, responseRate * 0.3)
      )
    )
  )
  const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0
  const operatingReadiness = Math.min(
    100,
    Math.round(opsHealth * 0.55 + goalCompletionRate * 0.25 + Math.min(100, recentApplications30d * 3) * 0.2)
  )

  const priorities = [
    overdueFollowups.length > 0 && {
      title: `${overdueFollowups.length} follow-up${overdueFollowups.length > 1 ? 's are' : ' is'} overdue`,
      description: 'Recover momentum by scheduling and sending follow-up emails for delayed applications.',
      href: '/app/applications',
      severity: 'high',
    },
    staleApplications.length > 0 && {
      title: `${staleApplications.length} stale application${staleApplications.length > 1 ? 's' : ''}`,
      description: 'Refresh stalled opportunities with status updates or targeted outreach.',
      href: '/app/applications',
      severity: 'medium',
    },
    (avgATS < 75 || avgMatch < 70) && {
      title: 'Resume-to-role alignment needs improvement',
      description: 'Increase ATS and match scores by incorporating high-frequency missing keywords.',
      href: '/app/resumes',
      severity: 'medium',
    },
    goalsDueSoon.length > 0 && {
      title: `${goalsDueSoon.length} goal${goalsDueSoon.length > 1 ? 's' : ''} due soon`,
      description: 'Review upcoming goals and break them into this-week execution milestones.',
      href: '/app/goals',
      severity: 'low',
    },
    forecastProjection8w.expectedOffers < 1 && {
      title: 'Forecasted offers are below target',
      description: `Current 8-week forecast is ${forecastProjection8w.expectedOffers} offers. Increase volume or lift resume quality.`,
      href: '/app/forecast',
      severity: 'high',
    },
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; severity: 'high' | 'medium' | 'low' }>

  const aiPrompt = [
    'Generate a command-center executive action brief.',
    `Ops health: ${opsHealth}.`,
    `Operating readiness: ${operatingReadiness}.`,
    `Active pipeline: ${activeApplications.length}.`,
    `Overdue follow-ups: ${overdueFollowups.length}.`,
    `Stale applications: ${staleApplications.length}.`,
    `Response rate: ${Math.round(responseRate)}%.`,
    `8-week projected offers: ${forecastProjection8w.expectedOffers}.`,
  ].join(' ')

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">Enterprise operations view for pipeline health, risk, and execution priorities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/control-tower" className="btn-outline">
            <Sparkles className="w-4 h-4" />
            Control Tower
          </Link>
          <Link href="/app/program-office" className="btn-outline">
            <ClipboardCheck className="w-4 h-4" />
            Program Office
          </Link>
          <Link href="/app/insights" className="btn-outline">
            <TrendingUp className="w-4 h-4" />
            Open Deep Insights
          </Link>
          <Link href="/app/help" className="btn-outline">
            <BookOpenCheck className="w-4 h-4" />
            Operating Guide
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Ops Health</span>
            <Sparkles className="w-4 h-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold mb-2">{opsHealth}</div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full ${opsHealth >= 80 ? 'bg-green-500' : opsHealth >= 60 ? 'bg-saffron-500' : 'bg-red-500'}`}
              style={{ width: `${opsHealth}%` }}
            />
          </div>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Active Pipeline</span>
            <Briefcase className="w-4 h-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{activeApplications.length}</div>
          <p className="text-xs text-muted-foreground mt-2">{recentApplications7d} added in 7 days</p>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Response Rate</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{formatPct(responseRate)}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Interview {formatPct(interviewRate)} • Offer {formatPct(offerRate)}
          </p>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Quality Index</span>
            <Target className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{Math.round((avgATS + avgMatch) / 2 || 0)}</div>
          <p className="text-xs text-muted-foreground mt-2">ATS {Math.round(avgATS || 0)} • Match {Math.round(avgMatch || 0)}</p>
        </div>
      </div>

      <AIOpsBrief
        surface="command-center"
        title="AI Command-Center Operator"
        description="Convert risk signals into a prioritized multi-module execution ladder."
        defaultPrompt={aiPrompt}
        prompts={[
          'What should leadership review first this week?',
          'Build a 5-day risk burn-down sequence.',
          'How do I increase projected offers in 8 weeks?',
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Priority Queue</h2>
          {priorities.length === 0 ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-5 text-sm text-green-700">
              No urgent risks detected. Your operating cadence looks healthy.
            </div>
          ) : (
            <div className="space-y-3">
              {priorities.map((item, index) => (
                <Link
                  key={`${item.title}-${index}`}
                  href={item.href}
                  className="block rounded-xl border border-border p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {item.severity === 'high' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : item.severity === 'medium' ? (
                          <CalendarClock className="w-4 h-4 text-saffron-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <h3 className="font-medium">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Keyword Intelligence</h2>
          {topMissingKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meaningful keyword gaps detected yet.</p>
          ) : (
            <div className="space-y-3">
              {topMissingKeywords.map(([keyword, count]) => (
                <div key={keyword}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{keyword}</span>
                    <span className="text-muted-foreground">{count} roles</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-saffron-500 rounded-full"
                      style={{ width: `${Math.min(100, count * 15)}%` }}
                    />
                  </div>
                </div>
              ))}
              <Link href="/app/resumes" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-2">
                Improve resume coverage
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-2">Execution Cadence</h2>
          <p className="text-sm text-muted-foreground mb-4">Recent velocity against target operating rhythm.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Applications (7 days)</span>
              <span className="font-medium">{recentApplications7d}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Applications (30 days)</span>
              <span className="font-medium">{recentApplications30d}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Interview sessions</span>
              <span className="font-medium">{sessions.length}</span>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-2">Goal Alignment</h2>
          <p className="text-sm text-muted-foreground mb-4">Track strategic goals and deadlines.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Total goals</span>
              <span className="font-medium">{goals.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Completed</span>
              <span className="font-medium">{completedGoals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Due in 10 days</span>
              <span className={`font-medium ${goalsDueSoon.length > 0 ? 'text-saffron-600' : ''}`}>{goalsDueSoon.length}</span>
            </div>
          </div>
          <Link href="/app/goals" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open goals workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-2">Execution Alerts</h2>
          <p className="text-sm text-muted-foreground mb-4">Focus areas that need immediate attention.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Overdue follow-ups</span>
              <span className={`font-medium ${overdueFollowups.length > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {overdueFollowups.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Stale applications</span>
              <span className={`font-medium ${staleApplications.length > 0 ? 'text-saffron-600' : 'text-green-600'}`}>
                {staleApplications.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Interview stage apps</span>
              <span className="font-medium">{interviews}</span>
            </div>
          </div>
          <Link href="/app/applications" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Resolve pipeline risks
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-2">Forecast Horizon</h2>
          <p className="text-sm text-muted-foreground mb-4">Projected outcomes at target operating cadence.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Target applications/week</span>
              <span className="font-medium">{recommendedWeeklyTarget}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Projected interviews (8w)</span>
              <span className="font-medium">{forecastProjection8w.expectedInterviews}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Projected offers (8w)</span>
              <span className={`font-medium ${forecastProjection8w.expectedOffers >= 2 ? 'text-green-600' : 'text-saffron-600'}`}>
                {forecastProjection8w.expectedOffers}
              </span>
            </div>
          </div>
          <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open forecast planner
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-2">Operating Readiness</h2>
          <p className="text-sm text-muted-foreground mb-4">Composite readiness from control, execution, and goals.</p>
          <div className="text-3xl font-bold">{operatingReadiness}</div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden mt-3">
            <div
              className={`h-full ${
                operatingReadiness >= 80 ? 'bg-green-500' : operatingReadiness >= 60 ? 'bg-saffron-500' : 'bg-red-500'
              }`}
              style={{ width: `${operatingReadiness}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {operatingReadiness >= 80 ? 'Enterprise-ready cadence' : operatingReadiness >= 60 ? 'Stable but improvable' : 'Needs immediate uplift'}
          </p>
          <Link href="/app/help" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open operating playbook
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-navy-600" />
          <h2 className="font-semibold">Enterprise Weekly Review Checklist</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg bg-secondary/40 p-3">Refresh top 3 role targets and validate qualification match.</div>
          <div className="rounded-lg bg-secondary/40 p-3">Run ATS analysis for each active resume variant before new applications.</div>
          <div className="rounded-lg bg-secondary/40 p-3">Follow up on every application older than 7 days without response.</div>
          <div className="rounded-lg bg-secondary/40 p-3">Complete at least one interview practice session and review weak answers.</div>
        </div>
      </div>
    </div>
  )
}
