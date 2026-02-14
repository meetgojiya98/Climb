"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  Flag,
  Gauge,
  LineChart,
  ListChecks,
  Monitor,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  TrendingUp,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AIOpsBrief } from "@/components/app/ai-ops-brief"
import { projectPipeline } from "@/lib/forecast"

type Device = "mobile" | "ipad" | "desktop"

interface BlueprintPhase {
  name: string
  goal: string
  durationDays: number
  owner: string
  moduleHref: string
  playbook: string[]
  mobileTip: string
  ipadTip: string
  desktopTip: string
}

interface BlueprintKPI {
  name: string
  target: string
  current: string
  why: string
}

interface BlueprintCadence {
  day: string
  focus: string
  actions: string[]
  timeBudget: string
}

interface WorkflowBlueprint {
  overview: string
  phases: BlueprintPhase[]
  kpis: BlueprintKPI[]
  dailyCadence: BlueprintCadence[]
  quickPrompts: string[]
  confidence: number
}

interface ReadinessDimension {
  id: string
  label: string
  score: number
  status: "strong" | "stable" | "at_risk"
  detail: string
  href: string
}

interface ReadinessRecommendation {
  title: string
  detail: string
  href: string
  priority: "high" | "medium" | "low"
}

interface AIReadiness {
  overallScore: number
  maturityBand: string
  dimensions: ReadinessDimension[]
  recommendations: ReadinessRecommendation[]
  risk: {
    overdue: number
    stale: number
    noAction: number
    goalsDueSoon: number
  }
  baseRates: {
    responseRate: number
    interviewRate: number
    offerRate: number
    recommendedWeeklyTarget: number
  }
  updatedAt: string
}

type TransformationFocus = "velocity" | "quality" | "control" | "interview" | "governance" | "forecast"

interface TransformationPillar {
  title: string
  owner: string
  outcome: string
  moduleHref: string
  initiatives: string[]
}

interface TransformationRoadmap {
  window: string
  objective: string
  actions: string[]
  kpis: string[]
}

interface TransformationAutomation {
  name: string
  trigger: string
  action: string
  impact: string
  href: string
}

interface TransformationGuardrail {
  risk: string
  mitigation: string
  owner: string
  metric: string
}

interface AITransformationPlan {
  transformationName: string
  summary: string
  northStar: {
    goal: string
    target: string
    metric: string
  }
  pillars: TransformationPillar[]
  roadmap: TransformationRoadmap[]
  automations: TransformationAutomation[]
  guardrails: TransformationGuardrail[]
  quickPrompts: string[]
  confidence: number
  generatedAt: string
}

const TRANSFORMATION_FOCUS_OPTIONS: Array<{
  id: TransformationFocus
  label: string
  detail: string
}> = [
  { id: "velocity", label: "Velocity", detail: "Increase weekly throughput with tighter operating cadence." },
  { id: "quality", label: "Quality", detail: "Lift ATS, role alignment, and application strength." },
  { id: "control", label: "Control", detail: "Reduce overdue and stale operational risk." },
  { id: "interview", label: "Interview", detail: "Improve interview conversion with structured practice loops." },
  { id: "governance", label: "Governance", detail: "Run KPI-led weekly reviews and accountability loops." },
  { id: "forecast", label: "Forecast", detail: "Optimize scenario planning and projected offer confidence." },
]

const SURFACE_MAP = [
  {
    title: "Transformation Lab",
    detail: "Generate enterprise AI roadmaps with automations, guardrails, and 3-window execution plans.",
    href: "/app/ai-studio",
  },
  {
    title: "Horizons Studio",
    detail: "Build H1-H3 horizontal expansion plans with feature pods, KPI checkpoints, and cadence controls.",
    href: "/app/horizons",
  },
  {
    title: "Global Copilot",
    detail: "Cross-module guidance with action links and quick follow-up prompts.",
    href: "/app/dashboard",
  },
  {
    title: "Control Tower AI",
    detail: "Risk-first remediation plans for follow-up SLA and stale pipeline records.",
    href: "/app/control-tower",
  },
  {
    title: "Program Office AI",
    detail: "Governance-led weekly priorities for quality, velocity, and strategic delivery.",
    href: "/app/program-office",
  },
  {
    title: "Interview AI Coach",
    detail: "Per-answer scoring with rewrite guidance and measurable improvement actions.",
    href: "/app/interviews",
  },
  {
    title: "Resume Portfolio AI",
    detail: "ATS-safe summaries plus enterprise portfolio planning with multi-track KPI execution.",
    href: "/app/resumes",
  },
  {
    title: "Roles Intelligence AI",
    detail: "Role-intake prioritization, parsing coverage recovery, and keyword-fit optimization.",
    href: "/app/roles",
  },
  {
    title: "Applications AI Brief",
    detail: "Pipeline conversion strategy with priority actions and follow-up plays.",
    href: "/app/applications",
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export default function AIStudioPage() {
  const [intent, setIntent] = useState("Build a high-discipline weekly execution system with measurable conversion lift.")
  const [weeklyHours, setWeeklyHours] = useState(10)
  const [devices, setDevices] = useState<Record<Device, boolean>>({
    mobile: true,
    ipad: true,
    desktop: true,
  })
  const [blueprint, setBlueprint] = useState<WorkflowBlueprint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<AIReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [simApplicationsPerWeek, setSimApplicationsPerWeek] = useState(8)
  const [simQualityLift, setSimQualityLift] = useState(8)
  const [simWeeks, setSimWeeks] = useState(8)
  const [transformationIntent, setTransformationIntent] = useState(
    "Roll out an AI-first operating model that materially improves conversion quality and forecast confidence in one quarter."
  )
  const [operatingMode, setOperatingMode] = useState<"solo" | "coach" | "team">("solo")
  const [riskTolerance, setRiskTolerance] = useState(55)
  const [horizonWeeks, setHorizonWeeks] = useState(12)
  const [focusAreas, setFocusAreas] = useState<TransformationFocus[]>(["velocity", "quality", "control"])
  const [transformationPlan, setTransformationPlan] = useState<AITransformationPlan | null>(null)
  const [transformationLoading, setTransformationLoading] = useState(false)
  const [transformationError, setTransformationError] = useState<string | null>(null)

  const selectedDevices = useMemo(
    () =>
      (Object.entries(devices) as Array<[Device, boolean]>)
        .filter(([, enabled]) => enabled)
        .map(([device]) => device),
    [devices]
  )

  useEffect(() => {
    const loadReadiness = async () => {
      setReadinessLoading(true)
      setReadinessError(null)
      try {
        const response = await fetch("/api/agent/ai-readiness")
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load AI readiness insights")
        }
        const payload = data?.readiness as AIReadiness
        setReadiness(payload)
        if (payload?.baseRates?.recommendedWeeklyTarget) {
          setSimApplicationsPerWeek(clamp(payload.baseRates.recommendedWeeklyTarget, 3, 24))
        }
      } catch (err) {
        setReadinessError(err instanceof Error ? err.message : "AI readiness request failed")
      } finally {
        setReadinessLoading(false)
      }
    }

    void loadReadiness()
  }, [])

  const simulation = useMemo(() => {
    const responseRate = readiness?.baseRates?.responseRate ?? 22
    const interviewRate = readiness?.baseRates?.interviewRate ?? 9
    const offerRate = readiness?.baseRates?.offerRate ?? 3
    return projectPipeline({
      applicationsPerWeek: simApplicationsPerWeek,
      weeks: simWeeks,
      responseRate,
      interviewRate,
      offerRate,
      qualityLiftPct: simQualityLift,
    })
  }, [readiness, simApplicationsPerWeek, simQualityLift, simWeeks])

  const generateBlueprint = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/agent/workflow-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          weeklyHours,
          devices: selectedDevices.length > 0 ? selectedDevices : ["desktop"],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate workflow blueprint")
      }

      setBlueprint(data?.blueprint || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow blueprint failed")
    } finally {
      setLoading(false)
    }
  }

  const toggleFocusArea = (focus: TransformationFocus) => {
    setFocusAreas((prev) => {
      const exists = prev.includes(focus)
      if (exists) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== focus)
      }
      if (prev.length >= 4) return [...prev.slice(1), focus]
      return [...prev, focus]
    })
  }

  const generateTransformationPlan = async () => {
    if (transformationLoading) return
    setTransformationLoading(true)
    setTransformationError(null)

    try {
      const response = await fetch("/api/agent/ai-transformation-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: transformationIntent,
          operatingMode,
          horizonWeeks,
          riskTolerance,
          focusAreas,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate AI transformation plan")
      }

      setTransformationPlan(data?.plan || null)
    } catch (err) {
      setTransformationError(err instanceof Error ? err.message : "AI transformation plan failed")
    } finally {
      setTransformationLoading(false)
    }
  }

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)
      setTimeout(() => setCopiedPrompt(null), 1400)
    } catch {
      setCopiedPrompt(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-saffron-500/20 p-5 sm:p-7 lg:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-8 right-0 h-40 w-40 rounded-full bg-saffron-500/25 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
            <Sparkles className="h-3.5 w-3.5 text-saffron-300" />
            Enterprise AI Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-3">AI Studio</h1>
          <p className="text-sm sm:text-base text-white/75 mt-2 max-w-3xl">
            Design your end-to-end operating flow, generate AI strategy briefs, and run the whole Climb system with consistent enterprise execution across mobile, iPad, and desktop.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/help" className="btn-outline text-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
              Open Playbook
            </Link>
            <Link href="/app/dashboard" className="btn-saffron text-sm">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-saffron-700 bg-saffron-500/10 rounded-full px-2.5 py-1">
              <Bot className="h-3.5 w-3.5" />
              AI Transformation Lab
            </div>
            <h2 className="font-semibold mt-2">Build a full enterprise AI operating plan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate a 3-window roadmap with pillars, automations, and governance guardrails aligned to your real operating metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void generateTransformationPlan()
            }}
            disabled={transformationLoading}
            className="btn-saffron text-sm"
          >
            {transformationLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {transformationLoading ? "Generating Plan..." : "Generate Transformation Plan"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Transformation Intent</label>
              <textarea
                value={transformationIntent}
                onChange={(event) => setTransformationIntent(event.target.value)}
                className="input-field min-h-[96px] mt-1"
                placeholder="Describe what this AI transformation must achieve."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Operating Mode</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { id: "solo" as const, label: "Solo" },
                    { id: "coach" as const, label: "Coach" },
                    { id: "team" as const, label: "Team" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOperatingMode(mode.id)}
                      className={cn(
                        "rounded-xl border px-2.5 py-2 text-xs transition-colors",
                        operatingMode === mode.id
                          ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Planning Horizon</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[8, 12, 16].map((weeks) => (
                    <button
                      key={weeks}
                      type="button"
                      onClick={() => setHorizonWeeks(weeks)}
                      className={cn(
                        "rounded-xl border px-2.5 py-2 text-xs transition-colors",
                        horizonWeeks === weeks
                          ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      {weeks}w
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Risk Tolerance</span>
                <span>{riskTolerance}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={riskTolerance}
                onChange={(event) => setRiskTolerance(clamp(Number(event.target.value), 0, 100))}
                className="w-full accent-saffron-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {riskTolerance >= 70 ? "Growth-biased plan" : riskTolerance >= 40 ? "Balanced plan" : "Risk-first plan"}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Primary Focus Areas (up to 4)</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {TRANSFORMATION_FOCUS_OPTIONS.map((focus) => {
                  const active = focusAreas.includes(focus.id)
                  return (
                    <button
                      key={focus.id}
                      type="button"
                      onClick={() => toggleFocusArea(focus.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-colors",
                        active ? "border-saffron-500/40 bg-saffron-500/10" : "border-border hover:bg-secondary"
                      )}
                    >
                      <p className="text-xs font-medium">{focus.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{focus.detail}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {transformationError && <p className="text-xs text-red-600">{transformationError}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            {!transformationPlan ? (
              <div className="h-full flex flex-col">
                <p className="text-sm font-medium">What this generates</p>
                <div className="space-y-2 mt-3 text-xs text-muted-foreground">
                  <p>• AI transformation north-star and target metrics</p>
                  <p>• Pillar-based operating model with module ownership</p>
                  <p>• Sequenced execution roadmap for your selected horizon</p>
                  <p>• Automation catalog and governance guardrails</p>
                  <p>• Prompt pack for ongoing AI-first operations</p>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-xs font-medium">Recommended sequence</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate plan, execute roadmap in Control Tower and Program Office, then re-run in 2 weeks to recalibrate.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{transformationPlan.transformationName}</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{transformationPlan.summary}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Flag className="h-3.5 w-3.5 text-saffron-600" />
                    North Star
                  </div>
                  <p className="text-sm font-medium mt-1">{transformationPlan.northStar.goal}</p>
                  <p className="text-xs text-muted-foreground mt-1">{transformationPlan.northStar.target}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Metric: {transformationPlan.northStar.metric}</p>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Confidence {Math.round(Math.max(0, Math.min(1, transformationPlan.confidence)) * 100)}%
                  {transformationPlan.generatedAt ? ` • Updated ${new Date(transformationPlan.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2">
              <Gauge className="h-4 w-4 text-saffron-600" />
              <h2 className="font-semibold">AI Readiness Scoreboard</h2>
            </div>
            {readiness?.updatedAt && (
              <span className="text-[11px] text-muted-foreground">
                Updated {new Date(readiness.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {readinessLoading ? (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading enterprise readiness insights...
            </div>
          ) : readinessError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700">
              {readinessError}
            </div>
          ) : readiness ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 bg-secondary/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Overall AI Readiness</p>
                  <span className="text-xs px-2 py-1 rounded-full border border-border bg-background/70">
                    {readiness.maturityBand}
                  </span>
                </div>
                <p className="text-3xl font-bold mt-2">{readiness.overallScore}</p>
                <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${readiness.overallScore}%` }} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {readiness.dimensions.map((dimension) => (
                  <Link
                    key={dimension.id}
                    href={dimension.href}
                    className="rounded-xl border border-border p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{dimension.label}</p>
                      <span className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded",
                        dimension.status === "strong"
                          ? "bg-green-500/15 text-green-700"
                          : dimension.status === "stable"
                          ? "bg-saffron-500/15 text-saffron-700"
                          : "bg-red-500/15 text-red-700"
                      )}>
                        {dimension.score}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{dimension.detail}</p>
                  </Link>
                ))}
              </div>

              {readiness.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority Recommendations</p>
                  {readiness.recommendations.slice(0, 3).map((item) => (
                    <Link key={item.title} href={item.href} className="block rounded-xl border border-border p-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <span className={cn(
                          "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                          item.priority === "high" ? "bg-red-500/15 text-red-700" : "bg-saffron-500/15 text-saffron-700"
                        )}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="h-4 w-4 text-saffron-600" />
            <h2 className="font-semibold">AI Outcome Simulator</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Run what-if scenarios to forecast responses, interviews, and offers before committing weekly plans.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Applications per week</span>
                <span>{simApplicationsPerWeek}</span>
              </div>
              <input
                type="range"
                min={3}
                max={24}
                step={1}
                value={simApplicationsPerWeek}
                onChange={(event) => setSimApplicationsPerWeek(clamp(Number(event.target.value), 3, 24))}
                className="w-full accent-saffron-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Quality lift</span>
                <span>{simQualityLift}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={simQualityLift}
                onChange={(event) => setSimQualityLift(clamp(Number(event.target.value), 0, 25))}
                className="w-full accent-saffron-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Horizon</span>
                <span>{simWeeks} weeks</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[8, 12].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSimWeeks(option)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs transition-colors",
                      simWeeks === option ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700" : "border-border hover:bg-secondary"
                    )}
                  >
                    {option} weeks
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Responses</p>
              <p className="text-lg font-semibold">{simulation.expectedResponses}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Interviews</p>
              <p className="text-lg font-semibold">{simulation.expectedInterviews}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Offers</p>
              <p className="text-lg font-semibold">{simulation.expectedOffers}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            Effective rates: {Math.round(simulation.effectiveResponseRate)}% response, {Math.round(simulation.effectiveInterviewRate)}% interview, {Math.round(simulation.effectiveOfferRate)}% offer.
          </div>

          {readiness && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border p-2.5">
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Overdue
                </div>
                <p className="font-medium mt-1">{readiness.risk.overdue}</p>
              </div>
              <div className="rounded-xl border border-border p-2.5">
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-saffron-600" />
                  No Action
                </div>
                <p className="font-medium mt-1">{readiness.risk.noAction}</p>
              </div>
              <div className="rounded-xl border border-border p-2.5">
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-navy-600" />
                  Stale
                </div>
                <p className="font-medium mt-1">{readiness.risk.stale}</p>
              </div>
              <div className="rounded-xl border border-border p-2.5">
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Target className="h-3.5 w-3.5 text-purple-600" />
                  Goals Due Soon
                </div>
                <p className="font-medium mt-1">{readiness.risk.goalsDueSoon}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <AIOpsBrief
          surface="global"
          title="AI Mission Brief"
          description="Generate cross-module priorities, decision paths, and execution links."
          defaultPrompt="Generate a complete enterprise mission brief for this week, including risk-first actions and KPI checkpoints."
          prompts={[
            "Generate today's top 3 actions across all modules.",
            "What should I prioritize for mobile execution right now?",
            "Build an executive update brief for Friday.",
          ]}
        />

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Workflow className="h-4 w-4 text-saffron-600" />
            <h2 className="font-semibold">Workflow Architect</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a personalized AI workflow blueprint for your weekly operating cadence.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Intent</label>
              <textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                className="input-field min-h-[90px] mt-1"
                placeholder="Describe your primary outcome for this week."
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
                <span>Weekly Time Budget</span>
                <span>{weeklyHours}h</span>
              </div>
              <input
                type="range"
                min={4}
                max={30}
                step={1}
                value={weeklyHours}
                onChange={(event) => setWeeklyHours(clamp(Number(event.target.value), 4, 30))}
                className="w-full accent-saffron-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Primary Devices</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { id: "mobile" as const, label: "Mobile", icon: Smartphone },
                  { id: "ipad" as const, label: "iPad", icon: Tablet },
                  { id: "desktop" as const, label: "Desktop", icon: Monitor },
                ].map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => setDevices((prev) => ({ ...prev, [device.id]: !prev[device.id] }))}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-xs transition-colors inline-flex items-center justify-center gap-1.5",
                      devices[device.id]
                        ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    <device.icon className="h-3.5 w-3.5" />
                    {device.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void generateBlueprint()
              }}
              disabled={loading}
              className="btn-saffron w-full"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Generating Blueprint..." : "Generate Workflow Blueprint"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <h2 className="font-semibold mb-3">AI-First Operating Sequence</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Best-practice sequence to use Climb AI end-to-end with enterprise execution discipline.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "1. Readiness",
              detail: "Review AI readiness scores and top risks before planning.",
              href: "/app/ai-studio",
            },
            {
              title: "2. Blueprint",
              detail: "Generate workflow blueprint and lock weekly cadence.",
              href: "/app/ai-studio",
            },
            {
              title: "3. Production",
              detail: "Run resume and interview AI loops to lift quality.",
              href: "/app/resumes",
            },
            {
              title: "4. Control",
              detail: "Use Control Tower and Command Center to clear risk debt.",
              href: "/app/control-tower",
            },
            {
              title: "5. Governance",
              detail: "Close week with Program Office and reports.",
              href: "/app/program-office",
            },
          ].map((step) => (
            <Link key={step.title} href={step.href} className="rounded-xl border border-border p-3 hover:bg-secondary/40 transition-colors">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {transformationPlan && (
        <section className="space-y-6">
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="h-4 w-4 text-saffron-600" />
              <h2 className="font-semibold">Transformation Pillars</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {transformationPlan.pillars.map((pillar) => (
                <article key={pillar.title} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">{pillar.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Owner: {pillar.owner}</p>
                  <p className="text-xs text-muted-foreground mt-2">{pillar.outcome}</p>
                  <div className="mt-2 space-y-1">
                    {pillar.initiatives.slice(0, 3).map((initiative, index) => (
                      <p key={`${pillar.title}-${index}`} className="text-xs text-muted-foreground">• {initiative}</p>
                    ))}
                  </div>
                  <Link href={pillar.moduleHref} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                    Open module
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h2 className="font-semibold mb-3">Transformation Roadmap</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {transformationPlan.roadmap.map((phase) => (
                <article key={phase.window} className="rounded-xl border border-border p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{phase.window}</p>
                  <p className="text-sm font-medium mt-1">{phase.objective}</p>
                  <div className="mt-2 space-y-1">
                    {phase.actions.slice(0, 4).map((action, index) => (
                      <p key={`${phase.window}-action-${index}`} className="text-xs text-muted-foreground">• {action}</p>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">KPI checkpoints</p>
                    {phase.kpis.slice(0, 3).map((kpi, index) => (
                      <p key={`${phase.window}-kpi-${index}`} className="text-[11px] text-muted-foreground">• {kpi}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <h3 className="font-semibold mb-3">AI Automation Stack</h3>
              <div className="space-y-2">
                {transformationPlan.automations.map((item) => (
                  <Link key={item.name} href={item.href} className="block rounded-xl border border-border p-3 hover:bg-secondary/30 transition-colors">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Trigger: {item.trigger}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.action}</p>
                    <p className="text-[11px] text-saffron-700 mt-2">{item.impact}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <h3 className="font-semibold">Governance Guardrails</h3>
              </div>
              <div className="space-y-2">
                {transformationPlan.guardrails.map((item) => (
                  <div key={item.risk} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{item.risk}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.mitigation}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">Owner: {item.owner}</p>
                    <p className="text-[11px] text-muted-foreground">Metric: {item.metric}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3">Transformation Prompt Pack</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {transformationPlan.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    void copyPrompt(prompt)
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-left text-xs hover:border-saffron-500/35 hover:bg-saffron-500/5 transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {copiedPrompt === prompt ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {blueprint && (
        <section className="space-y-6">
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">AI Blueprint Overview</h2>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{blueprint.overview}</p>
              </div>
              <span className="text-xs rounded-full border border-border px-2.5 py-1 bg-secondary/30">
                Confidence {Math.round(Math.max(0, Math.min(1, blueprint.confidence)) * 100)}%
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Phased Enterprise Flow</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {blueprint.phases.map((phase) => (
                <article key={phase.name} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{phase.name}</h4>
                    <span className="text-[11px] text-muted-foreground">{phase.durationDays}d</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{phase.goal}</p>
                  <p className="text-xs mt-2">Owner: <span className="font-medium">{phase.owner}</span></p>
                  <div className="mt-2 space-y-1">
                    {phase.playbook.slice(0, 5).map((item, index) => (
                      <p key={`${phase.name}-${index}`} className="text-xs text-muted-foreground">• {item}</p>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Mobile: {phase.mobileTip}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">iPad: {phase.ipadTip}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Desktop: {phase.desktopTip}</p>
                  </div>
                  <Link href={phase.moduleHref} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                    Open module
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <h3 className="font-semibold mb-3">KPI Stack</h3>
              <div className="space-y-2">
                {blueprint.kpis.map((kpi) => (
                  <div key={kpi.name} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{kpi.name}</p>
                      <span className="text-xs text-muted-foreground">{kpi.current} / {kpi.target}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <h3 className="font-semibold mb-3">Weekly Cadence</h3>
              <div className="space-y-2">
                {blueprint.dailyCadence.map((slot) => (
                  <div key={slot.day} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{slot.day}</p>
                      <span className="text-xs text-muted-foreground">{slot.timeBudget}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{slot.focus}</p>
                    <div className="mt-1 space-y-1">
                      {slot.actions.map((action, index) => (
                        <p key={`${slot.day}-${index}`} className="text-xs text-muted-foreground">• {action}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3">AI Follow-up Prompt Pack</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {blueprint.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    void copyPrompt(prompt)
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-left text-xs hover:border-saffron-500/35 hover:bg-saffron-500/5 transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {copiedPrompt === prompt ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <h2 className="font-semibold mb-3">AI Surface Map</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Every major execution area now has an AI layer. Use this map to move fast while keeping governance discipline.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SURFACE_MAP.map((item) => (
            <Link key={item.title} href={item.href} className="rounded-xl border border-border p-3 hover:bg-secondary/40 transition-colors">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
              <span className="inline-flex items-center gap-1 text-xs text-saffron-600 mt-2">
                Open
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
