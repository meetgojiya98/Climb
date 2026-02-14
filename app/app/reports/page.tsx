import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buildForecastScenarios, deriveForecastMetrics, projectPipeline } from '@/lib/forecast'
import { buildExecutiveReport } from '@/lib/reporting'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Download,
  FileJson,
  FileSpreadsheet,
  LineChart,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'

function pct(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [applications, resumesResult, rolesResult, goalsResult, sessionsResult] = await Promise.all([
    fetchApplicationsCompatible(supabase, user.id),
    supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
    supabase.from('roles').select('id').eq('user_id', user.id),
    supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
    supabase.from('interview_sessions').select('id, created_at').eq('user_id', user.id),
  ])

  const report = buildExecutiveReport({
    applications,
    resumes: resumesResult.data || [],
    roles: rolesResult.data || [],
    goals: goalsResult.data || [],
    sessions: sessionsResult.data || [],
  })
  const forecastMetrics = deriveForecastMetrics(applications)
  const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
  const forecastScenarios = buildForecastScenarios(forecastMetrics)
  const forecast12w = projectPipeline({
    applicationsPerWeek: recommendedWeeklyTarget,
    weeks: 12,
    responseRate: forecastMetrics.responseRate,
    interviewRate: forecastMetrics.interviewRate,
    offerRate: forecastMetrics.offerRate,
    qualityLiftPct: 8,
  })

  const maxStatusCount = Math.max(1, ...report.pipelineByStatus.map((item) => item.count))
  const maxTrendCount = Math.max(1, ...report.weeklyTrend.map((item) => item.applications))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Executive Reports</h1>
          <p className="text-muted-foreground">Board-level reporting for pipeline conversion, quality, and risk controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/reports/executive?format=csv" className="btn-outline">
            <FileSpreadsheet className="h-4 w-4" />
            Download CSV
          </a>
          <a href="/api/reports/executive?format=json" className="btn-outline">
            <FileJson className="h-4 w-4" />
            Download JSON
          </a>
          <a href="/api/reports/forecast?format=csv" className="btn-outline">
            <LineChart className="h-4 w-4" />
            Forecast CSV
          </a>
          <Link href="/app/control-tower" className="btn-outline">
            <ShieldCheck className="h-4 w-4" />
            Control Tower
          </Link>
          <Link href="/app/program-office" className="btn-outline">
            <ClipboardCheck className="h-4 w-4" />
            Program Office
          </Link>
          <Link href="/app/command-center" className="btn-saffron">
            <ArrowRight className="h-4 w-4" />
            Command Center
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Response Rate</span>
            <TrendingUp className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{pct(report.overview.responseRate)}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Offer Rate</span>
            <Target className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold">{pct(report.overview.offerRate)}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quality Index</span>
            <ShieldCheck className="h-4 w-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold">
            {Math.round((report.quality.averageAtsScore + report.quality.averageMatchScore) / 2)}
          </div>
        </div>
        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk Alerts</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold">{report.risk.overdueFollowUps + report.risk.staleApplications}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Pipeline Mix by Status</h2>
            <span className="text-xs text-muted-foreground">{report.overview.totalApplications} total applications</span>
          </div>
          <div className="space-y-3">
            {report.pipelineByStatus.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize">{item.status}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-saffron-500" style={{ width: `${(item.count / maxStatusCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Priority Recommendations</h2>
          <div className="space-y-3">
            {report.recommendations.map((text, index) => (
              <div key={index} className="rounded-xl border border-border p-3 text-sm">
                {text}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-secondary/70 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Download className="h-4 w-4 mt-0.5 shrink-0" />
            Export CSV weekly to keep an auditable operations trail for leadership reviews.
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">12-Week Forecast Envelope</h2>
            <span className="text-xs text-muted-foreground">{recommendedWeeklyTarget} apps/week target</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="text-muted-foreground mb-1">Projected Responses</p>
              <p className="text-xl font-semibold">{forecast12w.expectedResponses}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="text-muted-foreground mb-1">Projected Interviews</p>
              <p className="text-xl font-semibold">{forecast12w.expectedInterviews}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="text-muted-foreground mb-1">Projected Offers</p>
              <p className="text-xl font-semibold text-green-600">{forecast12w.expectedOffers}</p>
            </div>
          </div>
          <div className="space-y-3">
            {forecastScenarios.map((scenario) => {
              const twelveWeek = scenario.projections.find((projection) => projection.weeks === 12)
              if (!twelveWeek) return null
              return (
                <div key={scenario.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{scenario.label}</span>
                    <span className="text-muted-foreground">
                      {twelveWeek.totalApplications} apps • {twelveWeek.expectedOffers} offers
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-saffron-500"
                      style={{ width: `${Math.min(100, (twelveWeek.expectedOffers / Math.max(1, forecast12w.expectedOffers)) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Planning Controls</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Current weekly baseline</p>
              <p className="font-medium">{forecastMetrics.avgApplicationsPerWeek.toFixed(1)} applications/week</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Recommended operating target</p>
              <p className="font-medium">{recommendedWeeklyTarget} applications/week</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-muted-foreground mb-1">Offer signal</p>
              <p className={`font-medium ${forecast12w.expectedOffers >= 2 ? 'text-green-600' : 'text-saffron-600'}`}>
                {forecast12w.expectedOffers >= 2 ? 'Healthy trajectory' : 'Needs optimization'}
              </p>
            </div>
          </div>
          <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open interactive forecast planner
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">8-Week Volume Trend</h2>
          <div className="space-y-3">
            {report.weeklyTrend.map((week) => (
              <div key={week.week}>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{week.week}</span>
                  <span>
                    {week.applications} apps • {week.interviews} interviews • {week.offers} offers
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-navy-600"
                    style={{ width: `${(week.applications / maxTrendCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Top Companies by Activity</h2>
          {report.topCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No application data yet.</p>
          ) : (
            <div className="space-y-3">
              {report.topCompanies.map((company) => (
                <div key={company.company} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-sm">{company.company}</span>
                  <span className="text-xs text-muted-foreground">{company.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
