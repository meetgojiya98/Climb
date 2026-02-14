import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deriveForecastMetrics, projectPipeline } from '@/lib/forecast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  LineChart,
  Target,
  TrendingUp,
} from 'lucide-react'

type TrendBucket = {
  label: string
  applications: number
  interviews: number
  offers: number
}

function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: applications } = await supabase
    .from('applications')
    .select('id, company, position, status, applied_date, created_at, next_action_at, follow_up_date, match_score')
    .eq('user_id', user.id)

  const { data: resumes } = await supabase
    .from('resumes')
    .select('id, title, ats_score, updated_at')
    .eq('user_id', user.id)

  const { data: roles } = await supabase
    .from('roles')
    .select('id, parsed, created_at')
    .eq('user_id', user.id)

  const { data: skills } = await supabase
    .from('skills')
    .select('name')
    .eq('user_id', user.id)

  const apps = applications || []
  const allResumes = resumes || []
  const allRoles = roles || []
  const skillSet = new Set((skills || []).map((s) => String(s.name || '').toLowerCase().trim()))

  const totalApplications = apps.length
  const interviews = apps.filter((app) => app.status === 'interview').length
  const offers = apps.filter((app) => app.status === 'offer').length
  const screening = apps.filter((app) => app.status === 'screening').length
  const responded = apps.filter((app) => ['screening', 'interview', 'offer'].includes(String(app.status))).length

  const responseRate = pct(responded, totalApplications)
  const interviewRate = pct(interviews, totalApplications)
  const offerRate = pct(offers, totalApplications)
  const forecastMetrics = deriveForecastMetrics(apps)
  const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
  const forecast12w = projectPipeline({
    applicationsPerWeek: recommendedWeeklyTarget,
    weeks: 12,
    responseRate: forecastMetrics.responseRate,
    interviewRate: forecastMetrics.interviewRate,
    offerRate: forecastMetrics.offerRate,
    qualityLiftPct: 8,
  })

  const matchScores = apps
    .map((app) => Number(app.match_score))
    .filter((score) => Number.isFinite(score))
  const avgMatchScore = matchScores.length
    ? Math.round(matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length)
    : 0

  const atsScores = allResumes
    .map((resume) => Number(resume.ats_score))
    .filter((score) => Number.isFinite(score))
  const avgATS = atsScores.length
    ? Math.round(atsScores.reduce((sum, score) => sum + score, 0) / atsScores.length)
    : 0

  const today = new Date()
  const followupsDue = apps.filter((app) => {
    const dateValue = app.next_action_at || app.follow_up_date
    if (!dateValue) return false
    return new Date(dateValue) <= today
  }).length

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const rolesThisWeek = allRoles.filter((role) => new Date(role.created_at) >= sevenDaysAgo).length

  const trendMap = new Map<string, TrendBucket>()
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const key = weekKey(d)
    trendMap.set(key, {
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(key)),
      applications: 0,
      interviews: 0,
      offers: 0,
    })
  }

  apps.forEach((app) => {
    const dateValue = app.applied_date || app.created_at
    if (!dateValue) return
    const key = weekKey(new Date(dateValue))
    const bucket = trendMap.get(key)
    if (!bucket) return
    bucket.applications += 1
    if (app.status === 'interview') bucket.interviews += 1
    if (app.status === 'offer') bucket.offers += 1
  })

  const trends = Array.from(trendMap.values())
  const maxTrend = Math.max(1, ...trends.map((t) => t.applications))

  const keywordMentions: Record<string, number> = {}
  allRoles.forEach((role) => {
    const parsed = role.parsed as any
    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : []
    keywords.forEach((keyword: string) => {
      const key = String(keyword || '').trim().toLowerCase()
      if (!key) return
      keywordMentions[key] = (keywordMentions[key] || 0) + 1
    })
  })

  const topGaps = Object.entries(keywordMentions)
    .filter(([keyword]) => !skillSet.has(keyword))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Insights</h1>
          <p className="text-muted-foreground">Enterprise analytics for conversion, quality, and execution risk.</p>
        </div>
        <Link href="/app/command-center" className="btn-outline">
          Open Command Center
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Match Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-saffron-500" />
              <span className="text-3xl font-semibold">{avgMatchScore}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average ATS Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-semibold">{avgATS}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Roles Added (7 Days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-navy-600" />
              <span className="text-3xl font-semibold">{rolesThisWeek}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Follow-ups Due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${followupsDue > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <span className="text-3xl font-semibold">{followupsDue}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>12-Week Offers (Forecast)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-saffron-500" />
              <span className="text-3xl font-semibold">{forecast12w.expectedOffers}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">at {recommendedWeeklyTarget}/week cadence</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>8-Week Pipeline Trend</CardTitle>
            <CardDescription>Applications submitted per week with downstream outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{bucket.label}</span>
                    <span>
                      {bucket.applications} apps • {bucket.interviews} interviews • {bucket.offers} offers
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-saffron-500 rounded-full"
                      style={{ width: `${(bucket.applications / maxTrend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Bench</CardTitle>
            <CardDescription>How your funnel is converting right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Response Rate</span>
                <span className="font-medium">{responseRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-navy-600" style={{ width: `${responseRate}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Interview Rate</span>
                <span className="font-medium">{interviewRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-saffron-500" style={{ width: `${interviewRate}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Offer Rate</span>
                <span className="font-medium">{offerRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${offerRate}%` }} />
              </div>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              {totalApplications} applications • {screening} screening • {interviews} interviews • {offers} offers
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Keyword Gap Intelligence</CardTitle>
            <CardDescription>Most frequent role keywords not currently represented in your skills profile.</CardDescription>
          </CardHeader>
          <CardContent>
            {topGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No major recurring keyword gaps detected.</p>
            ) : (
              <div className="space-y-3">
                {topGaps.map(([keyword, count]) => (
                  <div key={keyword}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{keyword}</span>
                      <span className="text-muted-foreground">{count} mentions</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(100, count * 14)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution Signals</CardTitle>
            <CardDescription>Immediate pipeline actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <CalendarClock className="h-4 w-4 text-saffron-500 mt-0.5" />
              <div>
                <p className="font-medium">Follow-up Queue</p>
                <p className="text-muted-foreground">{followupsDue} applications are due for follow-up.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${avgATS < 75 ? 'text-red-500' : 'text-green-500'}`} />
              <div>
                <p className="font-medium">Resume Quality</p>
                <p className="text-muted-foreground">Average ATS score is {avgATS}.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <LineChart className={`h-4 w-4 mt-0.5 ${forecast12w.expectedOffers >= 2 ? 'text-green-500' : 'text-saffron-500'}`} />
              <div>
                <p className="font-medium">Forecast Signal</p>
                <p className="text-muted-foreground">
                  12-week projection is {forecast12w.expectedOffers} offers at {recommendedWeeklyTarget} apps/week.
                </p>
              </div>
            </div>
            <Link href="/app/applications" className="inline-flex items-center gap-2 text-saffron-600 hover:underline">
              Open applications board
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/app/forecast" className="inline-flex items-center gap-2 text-saffron-600 hover:underline">
              Open forecast planner
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
