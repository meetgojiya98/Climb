"use client"

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import {
  buildForecastRecommendations,
  ForecastMetrics,
  ForecastProjection,
  ForecastScenario,
  projectPipeline,
} from '@/lib/forecast'
import { toast } from 'sonner'
import { ScenarioLineChart, ScenarioRibbonTimeline } from '@/components/app/graphical-ui'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

type ForecastResponse = {
  success: boolean
  generatedAt: string
  metrics: ForecastMetrics
  scenarios: ForecastScenario[]
  recommendedWeeklyTarget: number
  recommendations: string[]
}

type PlannerDefaults = {
  applicationsPerWeek: number
  qualityLiftPct: number
  horizonWeeks: number
  offerGoal: number
}

const STORAGE_KEY = 'climb:forecast-planner:defaults:v1'
const AIOpsBrief = dynamic(() => import('@/components/app/ai-ops-brief').then((mod) => mod.AIOpsBrief))
const LiveOpsSignal = dynamic(() => import('@/components/app/live-ops-signal').then((mod) => mod.LiveOpsSignal))

const HORIZONS = [4, 8, 12]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readDefaults(): PlannerDefaults | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return {
      applicationsPerWeek: Number.isFinite(Number(parsed.applicationsPerWeek))
        ? clamp(Number(parsed.applicationsPerWeek), 1, 40)
        : 6,
      qualityLiftPct: Number.isFinite(Number(parsed.qualityLiftPct))
        ? clamp(Number(parsed.qualityLiftPct), -10, 40)
        : 5,
      horizonWeeks: HORIZONS.includes(Number(parsed.horizonWeeks)) ? Number(parsed.horizonWeeks) : 8,
      offerGoal: Number.isFinite(Number(parsed.offerGoal))
        ? clamp(Number(parsed.offerGoal), 1, 25)
        : 2,
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null)
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([])
  const [generatedAt, setGeneratedAt] = useState<string>('')
  const [recommendedWeeklyTarget, setRecommendedWeeklyTarget] = useState(6)
  const [recommendations, setRecommendations] = useState<string[]>([])

  const [applicationsPerWeek, setApplicationsPerWeek] = useState(6)
  const [qualityLiftPct, setQualityLiftPct] = useState(5)
  const [horizonWeeks, setHorizonWeeks] = useState(8)
  const [offerGoal, setOfferGoal] = useState(2)

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/reports/forecast', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load forecast data')
        }

        const payload = (await response.json()) as ForecastResponse
        const defaults = readDefaults()
        const fallbackRecommendations = buildForecastRecommendations(payload.metrics)

        setMetrics(payload.metrics)
        setScenarios(payload.scenarios || [])
        setGeneratedAt(payload.generatedAt || '')
        setRecommendedWeeklyTarget(payload.recommendedWeeklyTarget || 6)
        setRecommendations((payload.recommendations || []).length > 0 ? payload.recommendations : fallbackRecommendations)

        setApplicationsPerWeek(defaults?.applicationsPerWeek ?? payload.recommendedWeeklyTarget ?? 6)
        setQualityLiftPct(defaults?.qualityLiftPct ?? 5)
        setHorizonWeeks(defaults?.horizonWeeks ?? 8)
        setOfferGoal(defaults?.offerGoal ?? 2)
      } catch (err: any) {
        setError(err?.message || 'Unable to load forecast data.')
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [])

  const projection = useMemo<ForecastProjection | null>(() => {
    if (!metrics) return null
    return projectPipeline({
      applicationsPerWeek,
      weeks: horizonWeeks,
      responseRate: metrics.responseRate,
      interviewRate: metrics.interviewRate,
      offerRate: metrics.offerRate,
      qualityLiftPct,
    })
  }, [metrics, applicationsPerWeek, horizonWeeks, qualityLiftPct])

  const scenarioForHorizon = useMemo(() => {
    return scenarios
      .map((scenario) => ({
        scenario,
        projection: scenario.projections.find((item) => item.weeks === horizonWeeks),
      }))
      .filter((item) => Boolean(item.projection)) as Array<{ scenario: ForecastScenario; projection: ForecastProjection }>
  }, [scenarios, horizonWeeks])

  const offerGoalProgress = useMemo(() => {
    if (!projection) return 0
    if (offerGoal <= 0) return 0
    return clamp(Math.round((projection.expectedOffers / offerGoal) * 100), 0, 999)
  }, [projection, offerGoal])

  const scenarioLineSeries = useMemo(() => {
    const fallback = [
      { id: 'conservative', label: 'Conservative', color: '#60a5fa', points: [0, 1, 1, 2, 2, 3, 3, 4] },
      { id: 'base', label: 'Base', color: '#f59e0b', points: [0, 1, 2, 3, 4, 5, 6, 7] },
      { id: 'aggressive', label: 'Aggressive', color: '#22c55e', points: [0, 2, 3, 5, 7, 9, 11, 13] },
    ]

    if (scenarios.length === 0) return fallback

    const selected = scenarios.slice(0, 3).map((scenario) => {
      const points = scenario.projections
        .sort((a, b) => a.weeks - b.weeks)
        .map((item) => item.expectedOffers)
      return {
        id: scenario.id,
        label: scenario.label,
        color:
          scenario.id.includes('conservative')
            ? '#60a5fa'
            : scenario.id.includes('aggressive')
            ? '#22c55e'
            : '#f59e0b',
        points: points.length > 0 ? points : [0],
      }
    })

    return selected.length > 0 ? selected : fallback
  }, [scenarios])

  const aiPrompt = useMemo(() => {
    if (!metrics || !projection) return 'Generate a forecast strategy brief with scenario guidance.'
    return [
      'Generate an enterprise forecast strategist brief.',
      `Current weekly applications: ${metrics.avgApplicationsPerWeek.toFixed(1)}.`,
      `Recommended weekly target: ${recommendedWeeklyTarget}.`,
      `Current response/interview/offer rates: ${metrics.responseRate.toFixed(1)}%/${metrics.interviewRate.toFixed(1)}%/${metrics.offerRate.toFixed(1)}%.`,
      `Selected scenario: ${applicationsPerWeek} applications/week, quality lift ${qualityLiftPct}%, horizon ${horizonWeeks} weeks.`,
      `Projected responses/interviews/offers: ${projection.expectedResponses}/${projection.expectedInterviews}/${projection.expectedOffers}.`,
      `Offer goal: ${offerGoal} with progress ${offerGoalProgress}%.`,
    ].join(' ')
  }, [
    applicationsPerWeek,
    horizonWeeks,
    metrics,
    offerGoal,
    offerGoalProgress,
    projection,
    qualityLiftPct,
    recommendedWeeklyTarget,
  ])

  const handleSaveDefaults = () => {
    try {
      const defaults: PlannerDefaults = {
        applicationsPerWeek,
        qualityLiftPct,
        horizonWeeks,
        offerGoal,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
      toast.success('Forecast defaults saved')
    } catch {
      toast.error('Unable to save planner defaults')
    }
  }

  const applyScenario = (scenario: ForecastScenario) => {
    setApplicationsPerWeek(scenario.applicationsPerWeek)
    setQualityLiftPct(scenario.qualityLiftPct)
    toast.success(`${scenario.label} scenario applied`)
  }

  if (loading) {
    return (
      <div className="section-shell">
        <div className="card-elevated p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Building your enterprise forecast...
        </div>
      </div>
    )
  }

  if (error || !metrics || !projection) {
    return (
      <div className="section-shell-tight">
        <div className="card-elevated p-4 sm:p-5 lg:p-6 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <h1 className="font-semibold">Forecast unavailable</h1>
          </div>
          <p className="text-sm text-red-700">{error || 'No forecast data is available right now.'}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-outline mt-4 text-sm">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="section-shell section-stack">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Forecast Planner</h1>
          <p className="text-muted-foreground">
            Scenario modeling for weekly volume, quality lift, and offer conversion outcomes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSaveDefaults} className="btn-outline">
            <Settings2 className="h-4 w-4" />
            Save Defaults
          </button>
          <a href="/api/reports/forecast?format=csv" className="btn-outline">
            <Download className="h-4 w-4" />
            Download CSV
          </a>
          <Link href="/app/reports" className="btn-saffron">
            Executive Reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <LiveOpsSignal surface="forecast" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Current Weekly Volume</span>
            <TrendingUp className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{metrics.avgApplicationsPerWeek.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground mt-2">Recommended target: {recommendedWeeklyTarget}/week</p>
        </div>

        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Response Rate</span>
            <Sparkles className="h-4 w-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.responseRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-2">From {metrics.totalApplications} total applications</p>
        </div>

        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Interview Rate</span>
            <CalendarClock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.interviewRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-2">Current conversion from pipeline</p>
        </div>

        <div className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Offer Rate</span>
            <Target className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.offerRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-2">Quality-driven offer benchmark</p>
        </div>
      </div>

      <AIOpsBrief
        surface="forecast"
        title="AI Forecast Strategist"
        description="Translate scenarios into a weekly execution ladder with measurable conversion targets."
        defaultPrompt={aiPrompt}
        prompts={[
          'What scenario gives me the strongest offer upside with low risk?',
          'How should I adjust weekly volume if quality lift stalls?',
          'Build a mobile + iPad weekly forecast operating cadence.',
        ]}
      />

      <ScenarioLineChart
        series={scenarioLineSeries}
        yLabel="Projected offers"
      />

      <ScenarioRibbonTimeline series={scenarioLineSeries} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-1">What-if Controls</h2>
            <p className="text-sm text-muted-foreground">Adjust operating cadence and quality lift to model outcomes.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Applications per week: {applicationsPerWeek}</label>
              <input
                type="range"
                min={1}
                max={40}
                value={applicationsPerWeek}
                onChange={(event) => setApplicationsPerWeek(clamp(toNumber(event.target.value, applicationsPerWeek), 1, 40))}
                className="w-full"
              />
              <input
                type="number"
                min={1}
                max={40}
                value={applicationsPerWeek}
                onChange={(event) => setApplicationsPerWeek(clamp(toNumber(event.target.value, applicationsPerWeek), 1, 40))}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality lift: {qualityLiftPct}%</label>
              <input
                type="range"
                min={-10}
                max={40}
                value={qualityLiftPct}
                onChange={(event) => setQualityLiftPct(clamp(toNumber(event.target.value, qualityLiftPct), -10, 40))}
                className="w-full"
              />
              <input
                type="number"
                min={-10}
                max={40}
                value={qualityLiftPct}
                onChange={(event) => setQualityLiftPct(clamp(toNumber(event.target.value, qualityLiftPct), -10, 40))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Forecast horizon</div>
            <div className="grid grid-cols-3 gap-2">
              {HORIZONS.map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setHorizonWeeks(weeks)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    horizonWeeks === weeks ? 'border-climb bg-climb/5' : 'border-border hover:bg-secondary'
                  }`}
                >
                  {weeks} weeks
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
          <h2 className="font-semibold">Projected Output ({horizonWeeks} weeks)</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <span>Total applications</span>
              <span className="font-semibold">{projection.totalApplications}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <span>Expected responses</span>
              <span className="font-semibold">{projection.expectedResponses}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <span>Expected interviews</span>
              <span className="font-semibold">{projection.expectedInterviews}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <span>Expected offers</span>
              <span className="font-semibold text-green-600">{projection.expectedOffers}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Offer goal</span>
              <span>{offerGoal}</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={offerGoal}
              onChange={(event) => setOfferGoal(clamp(toNumber(event.target.value, offerGoal), 1, 25))}
              className="w-full"
            />
            <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${offerGoalProgress >= 100 ? 'bg-green-500' : offerGoalProgress >= 70 ? 'bg-saffron-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, offerGoalProgress)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{offerGoalProgress}% of target achieved in this scenario.</p>
          </div>

          <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            Generated {generatedAt ? new Date(generatedAt).toLocaleString() : 'just now'}.
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Scenario Benchmarks ({horizonWeeks} weeks)</h2>
            <span className="text-xs text-muted-foreground">Click a scenario to apply defaults</span>
          </div>
          <div className="space-y-3">
            {scenarioForHorizon.map(({ scenario, projection: scenarioProjection }) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => applyScenario(scenario)}
                className="w-full rounded-xl border border-border p-4 text-left hover:bg-secondary/40 transition-colors"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{scenario.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {scenario.applicationsPerWeek}/week • lift {scenario.qualityLiftPct}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-secondary/60 px-3 py-2">Responses: <span className="font-semibold">{scenarioProjection.expectedResponses}</span></div>
                  <div className="rounded-lg bg-secondary/60 px-3 py-2">Interviews: <span className="font-semibold">{scenarioProjection.expectedInterviews}</span></div>
                  <div className="rounded-lg bg-secondary/60 px-3 py-2">Offers: <span className="font-semibold">{scenarioProjection.expectedOffers}</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4">Execution Playbook</h2>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={`${recommendation}-${index}`} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <p>{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-saffron-500/20 bg-saffron-500/5 p-3 text-sm">
            <p className="font-medium mb-1">Recommended next step</p>
            <p className="text-muted-foreground">Set your operating target at {recommendedWeeklyTarget} applications/week and review conversion each Friday.</p>
          </div>
          <div className="mt-4 grid gap-2">
            <Link href="/app/applications" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
              Update application pipeline
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/app/insights" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
              Validate with insights
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
