import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  LineChart,
  ShieldCheck,
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

type WeeklyBucket = {
  label: string
  applications: number
  interviews: number
  offers: number
}

const ACTIVE_STATUSES = new Set(['applied', 'screening', 'interview'])
const RESPONSE_STATUSES = new Set(['screening', 'interview', 'offer'])

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekKey(date: Date): string {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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

export default async function ControlTowerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [applications, resumesResult, goalsResult, sessionsResult] = await Promise.all([
    fetchApplications(supabase, user.id),
    supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
    supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
    supabase.from('interview_sessions').select('id, created_at').eq('user_id', user.id),
  ])

  const allApplications = applications || []
  const resumes = resumesResult.data || []
  const goals = goalsResult.data || []
  const sessions = sessionsResult.data || []

  const now = new Date()
  const today = startOfDay(now)
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
    const base = safeDate(app.applied_date || app.created_at)
    if (!base) return false
    const ageDays = Math.floor((today.getTime() - startOfDay(base).getTime()) / (1000 * 60 * 60 * 24))
    return ageDays >= 14
  })

  const noAction = activeApps.filter((app) => !app.next_action_at && !app.follow_up_date)

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

  const activeCount = Math.max(1, activeApps.length)
  const slaCompliance = Math.max(0, Math.round(((activeCount - overdue.length - stale.length) / activeCount) * 100))
  const pipelineEfficiency = Math.round((pct(responses, allApplications.length) + pct(interviews, allApplications.length) + pct(offers, allApplications.length)) / 3)
  const executionScore = Math.max(0, Math.min(100, Math.round((slaCompliance * 0.45) + (qualityIndex * 0.35) + (pipelineEfficiency * 0.2))))

  const trendMap = new Map<string, WeeklyBucket>()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = weekKey(d)
    trendMap.set(key, {
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(key)),
      applications: 0,
      interviews: 0,
      offers: 0,
    })
  }

  allApplications.forEach((app) => {
    const date = safeDate(app.applied_date || app.created_at)
    if (!date) return
    const key = weekKey(date)
    const bucket = trendMap.get(key)
    if (!bucket) return
    bucket.applications += 1
    if (app.status === 'interview') bucket.interviews += 1
    if (app.status === 'offer') bucket.offers += 1
  })

  const weekly = Array.from(trendMap.values())
  const maxWeekly = Math.max(1, ...weekly.map((bucket) => bucket.applications))

  const highRiskQueue = [...activeApps]
    .sort((a, b) => {
      const aDate = safeDate(a.next_action_at || a.follow_up_date || a.applied_date || a.created_at)?.getTime() || 0
      const bDate = safeDate(b.next_action_at || b.follow_up_date || b.applied_date || b.created_at)?.getTime() || 0
      return aDate - bDate
    })
    .slice(0, 8)

  const goalsCompleted = goals.filter((goal: any) => Boolean(goal.completed)).length
  const sessions30d = sessions.filter((session: any) => {
    const d = safeDate(session.created_at)
    return d ? d >= thirtyDaysAgo : false
  }).length

  const playbook = [
    {
      title: 'Follow-up SLA',
      detail: `${overdue.length} overdue items. Clear all overdue follow-ups within 48 hours.`,
      status: overdue.length === 0 ? 'On track' : 'Needs attention',
    },
    {
      title: 'Pipeline Hygiene',
      detail: `${noAction.length} active applications have no next action date.`,
      status: noAction.length <= 2 ? 'Stable' : 'At risk',
    },
    {
      title: 'Quality Lift Program',
      detail: `Current quality index is ${qualityIndex}. Target 80+ for enterprise-grade conversion.`,
      status: qualityIndex >= 80 ? 'Strong' : 'Improve',
    },
    {
      title: 'Interview Readiness',
      detail: `${sessions30d} practice sessions in last 30 days. Keep cadence at 1-2 per week.`,
      status: sessions30d >= 4 ? 'Strong' : 'Improve',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Control Tower</h1>
          <p className="text-muted-foreground">Enterprise operating console for conversion, compliance, and execution velocity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/program-office" className="btn-outline">
            <ClipboardCheck className="h-4 w-4" />
            Program Office
          </Link>
          <Link href="/app/forecast" className="btn-outline">
            <LineChart className="h-4 w-4" />
            Forecast Planner
          </Link>
          <Link href="/app/reports" className="btn-saffron">
            <ArrowRight className="h-4 w-4" />
            Executive Reports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Execution Score</span>
            <Gauge className="h-4 w-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold">{executionScore}</div>
          <p className="text-xs text-muted-foreground mt-2">Composite enterprise operating score</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>SLA Compliance</span>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{slaCompliance}%</div>
          <p className="text-xs text-muted-foreground mt-2">Active pipeline follow-up discipline</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pipeline Efficiency</span>
            <TrendingUp className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{pipelineEfficiency}%</div>
          <p className="text-xs text-muted-foreground mt-2">Response, interview, and offer velocity</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Quality Index</span>
            <Target className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{qualityIndex}</div>
          <p className="text-xs text-muted-foreground mt-2">ATS + role match quality blend</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Goal Delivery</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{goalsCompleted}/{goals.length}</div>
          <p className="text-xs text-muted-foreground mt-2">Strategic goals completed</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">6-Week Throughput</h2>
            <span className="text-xs text-muted-foreground">Applications with downstream movement</span>
          </div>
          <div className="space-y-3">
            {weekly.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{bucket.label}</span>
                  <span>
                    {bucket.applications} apps • {bucket.interviews} interviews • {bucket.offers} offers
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-saffron-500" style={{ width: `${(bucket.applications / maxWeekly) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Risk Queue</h2>
          {highRiskQueue.length === 0 ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-5 text-sm text-green-700">
              No high-risk records. Pipeline is healthy.
            </div>
          ) : (
            <div className="space-y-2">
              {highRiskQueue.map((app) => {
                const isOverdue = overdue.some((item) => item.id === app.id)
                const isStaleApp = stale.some((item) => item.id === app.id)
                return (
                  <div key={app.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{app.position || 'Untitled Role'}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.company || 'Unknown Company'}</p>
                      </div>
                      {(isOverdue || isStaleApp) && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {isOverdue ? 'Overdue follow-up' : isStaleApp ? 'Stale record (14+ days)' : 'Needs next action'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/app/applications" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open pipeline board
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="h-4 w-4 text-navy-600" />
            <h2 className="font-semibold">Enterprise Playbook</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {playbook.map((item) => (
              <div key={item.title} className="rounded-xl border border-border p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{item.title}</p>
                  <span className={`text-xs font-medium ${item.status === 'Strong' || item.status === 'On track' || item.status === 'Stable' ? 'text-green-600' : 'text-saffron-600'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Operating Signals</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Overdue Follow-ups</p>
              <p className={`font-semibold ${overdue.length > 0 ? 'text-red-500' : 'text-green-600'}`}>{overdue.length}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Stale Applications</p>
              <p className={`font-semibold ${stale.length > 0 ? 'text-saffron-600' : 'text-green-600'}`}>{stale.length}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">No Next Action</p>
              <p className={`font-semibold ${noAction.length > 0 ? 'text-saffron-600' : 'text-green-600'}`}>{noAction.length}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Interview Sessions (30d)</p>
              <p className="font-semibold">{sessions30d}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Response / Interview / Offer</p>
              <p className="font-semibold">{pct(responses, allApplications.length)}% / {pct(interviews, allApplications.length)}% / {pct(offers, allApplications.length)}%</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/app/command-center" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
              View command center
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/app/insights" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
              View deep insights
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-saffron-500" />
          <h2 className="font-semibold">Weekly Executive Rhythm</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
          <div className="rounded-xl bg-secondary/50 p-4">
            Monday: refresh target roles, reprioritize pipeline tiers.
          </div>
          <div className="rounded-xl bg-secondary/50 p-4">
            Tuesday: send all overdue follow-ups and confirm interviews.
          </div>
          <div className="rounded-xl bg-secondary/50 p-4">
            Wednesday: resume optimization and keyword calibration run.
          </div>
          <div className="rounded-xl bg-secondary/50 p-4">
            Friday: export reports and run forecast scenario review.
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-saffron-500/10 px-3 py-2 text-sm text-saffron-700">
          <BarChart3 className="h-4 w-4" />
          Enterprise cadence enables predictable weekly progress.
        </div>
      </div>
    </div>
  )
}
