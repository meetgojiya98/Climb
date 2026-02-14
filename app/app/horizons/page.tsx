"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { AIOpsBrief } from "@/components/app/ai-ops-brief"
import { AIMissionConsole } from "@/components/app/ai-mission-console"
import { cn } from "@/lib/utils"
import { deriveForecastMetrics, projectPipeline } from "@/lib/forecast"
import {
  ArrowRight,
  Bot,
  Compass,
  Copy,
  Gauge,
  Globe2,
  Layers3,
  LineChart,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"

type Lane = "network" | "branding" | "role-intel" | "interview" | "compensation" | "automation" | "governance"
type OperatingMode = "solo" | "coach" | "team"

interface HorizonExpansionPlan {
  expansionName: string
  summary: string
  northStar: {
    goal: string
    target: string
    metric: string
  }
  horizons: Array<{
    horizon: "H1" | "H2" | "H3"
    window: string
    objective: string
    initiatives: string[]
    modules: string[]
    kpiCheckpoints: string[]
  }>
  featurePods: Array<{
    name: string
    value: string
    owner: string
    launchWindow: string
    moduleHref: string
  }>
  executionCadence: Array<{
    day: string
    focus: string
    action: string
    moduleHref: string
  }>
  automationBacklog: Array<{
    name: string
    trigger: string
    impact: string
    href: string
  }>
  quickPrompts: string[]
  confidence: number
}

interface BaselineMetrics {
  applications: number
  resumes: number
  roles: number
  goals: number
  parsedRoles: number
  avgATS: number
  responseRate: number
  interviewRate: number
  offerRate: number
  recommendedWeeklyTarget: number
  projectedOffers8w: number
  expansionReadiness: number
  activePods: number
}

const LANE_OPTIONS: Array<{
  id: Lane
  label: string
  detail: string
  href: string
}> = [
  { id: "network", label: "Network Growth", detail: "Expand inbound and outbound opportunity sources.", href: "/app/saved-jobs" },
  { id: "branding", label: "Brand Narrative", detail: "Strengthen positioning across resume assets.", href: "/app/resumes" },
  { id: "role-intel", label: "Role Intelligence", detail: "Scale parsing coverage and fit-gap strategy.", href: "/app/roles" },
  { id: "interview", label: "Interview Lift", detail: "Improve interview-to-offer conversion loops.", href: "/app/interviews" },
  { id: "compensation", label: "Comp Strategy", detail: "Improve compensation decision readiness.", href: "/app/salary-insights" },
  { id: "automation", label: "Automation", detail: "Create recurring AI-driven execution workflows.", href: "/app/command-center" },
  { id: "governance", label: "Governance", detail: "Run cross-module scorecards and decision loops.", href: "/app/program-office" },
]

const MODE_OPTIONS: Array<{ id: OperatingMode; label: string; detail: string }> = [
  { id: "solo", label: "Solo", detail: "Individual execution ownership." },
  { id: "coach", label: "Coach-Led", detail: "Advisor + candidate operating loop." },
  { id: "team", label: "Team", detail: "Program office and shared ownership." },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

export default function HorizonsPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<BaselineMetrics>({
    applications: 0,
    resumes: 0,
    roles: 0,
    goals: 0,
    parsedRoles: 0,
    avgATS: 0,
    responseRate: 0,
    interviewRate: 0,
    offerRate: 0,
    recommendedWeeklyTarget: 5,
    projectedOffers8w: 0,
    expansionReadiness: 0,
    activePods: 0,
  })
  const [ambition, setAmbition] = useState(
    "Expand Climb horizontally into multiple capability lanes without sacrificing conversion quality."
  )
  const [operatingMode, setOperatingMode] = useState<OperatingMode>("solo")
  const [horizonWeeks, setHorizonWeeks] = useState(12)
  const [riskTolerance, setRiskTolerance] = useState(55)
  const [lanes, setLanes] = useState<Lane[]>(["role-intel", "branding", "automation", "governance"])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<HorizonExpansionPlan | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const [applications, resumesResult, rolesResult, goalsResult] = await Promise.all([
          fetchApplicationsCompatible(supabase, user.id),
          supabase.from("resumes").select("id, ats_score").eq("user_id", user.id),
          supabase.from("roles").select("id, parsed").eq("user_id", user.id),
          supabase.from("career_goals").select("id").eq("user_id", user.id),
        ])

        const resumes = resumesResult.data || []
        const roles = rolesResult.data || []
        const goals = goalsResult.data || []
        const parsedRoles = roles.filter((role: any) => role.parsed && typeof role.parsed === "object").length
        const atsValues = resumes
          .map((resume: any) => Number(resume.ats_score))
          .filter((value: number) => Number.isFinite(value))
        const avgATS = atsValues.length > 0
          ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
          : 0

        const responseCount = applications.filter((app: any) =>
          ["screening", "interview", "offer"].includes(String(app.status || ""))
        ).length
        const interviewCount = applications.filter((app: any) => String(app.status || "") === "interview").length
        const offerCount = applications.filter((app: any) => String(app.status || "") === "offer").length

        const forecastMetrics = deriveForecastMetrics(applications)
        const recommendedWeeklyTarget = Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2))
        const projected = projectPipeline({
          applicationsPerWeek: recommendedWeeklyTarget,
          weeks: 8,
          responseRate: forecastMetrics.responseRate,
          interviewRate: forecastMetrics.interviewRate,
          offerRate: forecastMetrics.offerRate,
          qualityLiftPct: 6,
        })

        const expansionReadiness = Math.round(
          clamp(
            avgATS * 0.4 +
              (roles.length > 0 ? (parsedRoles / roles.length) * 100 : 0) * 0.25 +
              clamp((responseCount / Math.max(1, applications.length)) * 100, 0, 100) * 0.2 +
              clamp((goals.length / Math.max(1, goals.length + 2)) * 100, 0, 100) * 0.15,
            0,
            100
          )
        )

        const activePods = [
          resumes.length > 0,
          roles.length > 0,
          applications.length > 0,
          goals.length > 0,
          forecastMetrics.avgApplicationsPerWeek > 0,
          interviewCount > 0,
        ].filter(Boolean).length

        setMetrics({
          applications: applications.length,
          resumes: resumes.length,
          roles: roles.length,
          goals: goals.length,
          parsedRoles,
          avgATS: Number(avgATS.toFixed(1)),
          responseRate: Number(pct(responseCount, applications.length).toFixed(1)),
          interviewRate: Number(pct(interviewCount, applications.length).toFixed(1)),
          offerRate: Number(pct(offerCount, applications.length).toFixed(1)),
          recommendedWeeklyTarget,
          projectedOffers8w: projected.expectedOffers,
          expansionReadiness,
          activePods,
        })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const aiPrompt = useMemo(
    () =>
      [
        "Generate a horizontal expansion operating brief.",
        `Expansion readiness: ${metrics.expansionReadiness}. Active pods: ${metrics.activePods}.`,
        `Applications: ${metrics.applications}. Response/interview/offer: ${metrics.responseRate}%/${metrics.interviewRate}%/${metrics.offerRate}%.`,
        `Resumes: ${metrics.resumes}. Roles: ${metrics.roles} (${metrics.parsedRoles} parsed).`,
        `Recommended weekly target: ${metrics.recommendedWeeklyTarget}.`,
        "Focus on H1-H3 sequencing, pod launches, and KPI guardrails.",
      ].join(" "),
    [metrics]
  )

  const toggleLane = (lane: Lane) => {
    setLanes((prev) => {
      const exists = prev.includes(lane)
      if (exists) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== lane)
      }
      if (prev.length >= 5) return [...prev.slice(1), lane]
      return [...prev, lane]
    })
  }

  const generatePlan = async () => {
    if (generating) return
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/agent/horizon-expansion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambition,
          operatingMode,
          horizonWeeks,
          riskTolerance,
          lanes,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate horizon expansion plan")
      }
      setPlan(data?.expansion || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Horizon expansion plan failed")
    } finally {
      setGenerating(false)
    }
  }

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)
      setTimeout(() => setCopiedPrompt(null), 1300)
    } catch {
      setCopiedPrompt(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-saffron-500/20 p-5 sm:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-8 right-4 h-40 w-40 rounded-full bg-saffron-500/25 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
            <Globe2 className="h-3.5 w-3.5 text-saffron-300" />
            Horizontal Expansion Studio
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-3">Horizons</h1>
          <p className="text-sm sm:text-base text-white/75 mt-2 max-w-3xl">
            Scale your app usage across multiple feature horizons: launch new capability pods, run cross-module execution loops, and keep conversion quality controlled while expanding.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/ai-studio" className="btn-outline text-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
              Open AI Studio
            </Link>
            <Link href="/app/help" className="btn-outline text-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
              Open Playbook
            </Link>
            <Link href="/app/horizons" className="btn-saffron text-sm">
              Expansion Control
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Expansion Readiness</span>
            <Gauge className="h-4 w-4 text-saffron-500" />
          </div>
          <p className="text-3xl font-semibold mt-2">{loading ? "..." : metrics.expansionReadiness}</p>
          <p className="text-xs text-muted-foreground mt-1">Composite horizontal-scale baseline</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Active Pods</span>
            <Layers3 className="h-4 w-4 text-navy-600" />
          </div>
          <p className="text-3xl font-semibold mt-2">{loading ? "..." : metrics.activePods}</p>
          <p className="text-xs text-muted-foreground mt-1">Feature lanes currently operational</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Projected Offers (8w)</span>
            <LineChart className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-3xl font-semibold mt-2">{loading ? "..." : metrics.projectedOffers8w}</p>
          <p className="text-xs text-muted-foreground mt-1">Using current conversion baseline</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Weekly Target</span>
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-3xl font-semibold mt-2">{loading ? "..." : metrics.recommendedWeeklyTarget}</p>
          <p className="text-xs text-muted-foreground mt-1">Recommended application throughput</p>
        </div>
      </section>

      <AIOpsBrief
        surface="horizons"
        title="AI Horizon Expansion Strategist"
        description="Get a prioritized horizontal-scaling brief with H1-H3 execution focus."
        defaultPrompt={aiPrompt}
        prompts={[
          "Which horizon should I execute first this week?",
          "Design my H1 launch sequence for feature pods.",
          "How do I scale features without hurting conversion quality?",
        ]}
      />

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-700">
              <Bot className="h-3.5 w-3.5" />
              Multi-Horizon Planner
            </div>
            <h2 className="font-semibold mt-2">Generate an H1-H3 horizontal expansion roadmap</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Build a structured expansion plan with feature pods, KPI checkpoints, and automation backlog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void generatePlan()
            }}
            disabled={generating}
            className="btn-saffron text-sm"
          >
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate Expansion Plan"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expansion Ambition</label>
              <textarea
                value={ambition}
                onChange={(event) => setAmbition(event.target.value)}
                className="input-field min-h-[92px] mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Operating Mode</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setOperatingMode(mode.id)}
                    className={cn(
                      "rounded-xl border p-2 text-left transition-colors",
                      operatingMode === mode.id
                        ? "border-saffron-500/40 bg-saffron-500/10"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    <p className="text-xs font-medium">{mode.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{mode.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Expansion Lanes (select up to 5)</label>
              <div className="grid gap-2 sm:grid-cols-2 mt-1.5">
                {LANE_OPTIONS.map((lane) => {
                  const active = lanes.includes(lane.id)
                  return (
                    <button
                      key={lane.id}
                      type="button"
                      onClick={() => toggleLane(lane.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-colors",
                        active
                          ? "border-saffron-500/40 bg-saffron-500/10"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <p className="text-xs font-medium">{lane.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{lane.detail}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Horizon Weeks</span>
                  <span>{horizonWeeks}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={20}
                  step={1}
                  value={horizonWeeks}
                  onChange={(event) => setHorizonWeeks(clamp(Number(event.target.value), 8, 20))}
                  className="w-full accent-saffron-500"
                />
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
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
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            {!plan ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Plan output includes</p>
                <p>• Three horizons (H1/H2/H3) with sequence and ownership</p>
                <p>• Horizontal feature pods for new capability lanes</p>
                <p>• KPI checkpoints, weekly cadence, and automation backlog</p>
                <p>• AI follow-up commands for ongoing expansion control</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">{plan.expansionName}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plan.summary}</p>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-xs font-medium">North Star</p>
                  <p className="text-xs text-muted-foreground mt-1">{plan.northStar.goal}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Target: {plan.northStar.target}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Confidence {Math.round(Math.max(0, Math.min(1, plan.confidence)) * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {plan && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {plan.horizons.map((horizon) => (
                <article key={horizon.horizon} className="rounded-xl border border-border p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{horizon.horizon}</p>
                    <span className="text-[11px] text-muted-foreground">{horizon.window}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{horizon.objective}</p>
                  <div className="mt-2 space-y-1">
                    {horizon.initiatives.slice(0, 3).map((initiative, index) => (
                      <p key={`${horizon.horizon}-${index}`} className="text-xs text-muted-foreground">• {initiative}</p>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {horizon.modules.slice(0, 3).map((module) => (
                      <Link
                        key={`${horizon.horizon}-${module}`}
                        href={module}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-secondary"
                      >
                        {module.replace("/app/", "")}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">Feature Pods</p>
                <div className="space-y-2">
                  {plan.featurePods.map((pod) => (
                    <Link key={pod.name} href={pod.moduleHref || "/app/horizons"} className="block rounded-lg border border-border p-2.5 hover:bg-secondary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{pod.name}</p>
                        <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-saffron-500/10 text-saffron-700">
                          {pod.launchWindow}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{pod.value}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">Weekly Cadence + Automation</p>
                <div className="space-y-2">
                  {plan.executionCadence.slice(0, 5).map((slot) => (
                    <Link key={`${slot.day}-${slot.focus}`} href={slot.moduleHref || "/app/horizons"} className="block rounded-lg border border-border p-2.5 hover:bg-secondary/40 transition-colors">
                      <p className="text-xs font-medium">{slot.day} • {slot.focus}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{slot.action}</p>
                    </Link>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {plan.automationBacklog.slice(0, 3).map((item) => (
                    <Link key={item.name} href={item.href || "/app/horizons"} className="block rounded-lg border border-border p-2.5 hover:bg-secondary/40 transition-colors">
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{item.trigger}</p>
                      <p className="text-[11px] text-saffron-700 mt-1">{item.impact}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {plan.quickPrompts.length > 0 && (
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">AI Prompt Commands</p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        void copyPrompt(prompt)
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-secondary transition-colors inline-flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedPrompt === prompt ? "Copied" : prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <AIMissionConsole
        surface="horizons"
        title="AI Expansion Missions"
        description="Execute horizontal scaling missions across capability pods and module surfaces."
        missions={[
          {
            id: "horizons-h1-launch",
            title: "H1 Pod Launch",
            objective: "Launch the highest-impact pods without increasing execution risk.",
            prompt: "Create a 14-day H1 launch plan for horizontal expansion with owner and KPI checkpoints.",
            href: "/app/horizons",
            priority: "high",
          },
          {
            id: "horizons-role-brand-loop",
            title: "Role + Brand Loop",
            objective: "Tie role intelligence directly to resume positioning improvements.",
            prompt: "Design a weekly role-intelligence to brand-narrative loop with measurable outcomes.",
            href: "/app/roles",
            priority: "high",
          },
          {
            id: "horizons-conversion-shield",
            title: "Conversion Shield",
            objective: "Scale feature lanes while protecting response and interview quality.",
            prompt: "Build a conversion-protection plan while activating new feature pods.",
            href: "/app/forecast",
            priority: "medium",
          },
          {
            id: "horizons-governance",
            title: "Governance Autopilot",
            objective: "Create a weekly governance and automation sequence for expansion operations.",
            prompt: "Generate a governance autopilot loop for horizontal expansion with escalation triggers.",
            href: "/app/program-office",
            priority: "medium",
          },
        ]}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LANE_OPTIONS.slice(0, 4).map((lane) => (
          <Link key={lane.id} href={lane.href} className="card-interactive p-4 sm:p-5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-500/10 text-saffron-600">
              {lane.id === "role-intel" ? <Compass className="h-4 w-4" /> : lane.id === "automation" ? <Zap className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
            </div>
            <p className="text-sm font-medium mt-2">{lane.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{lane.detail}</p>
            <span className="inline-flex items-center gap-1 text-xs text-saffron-600 mt-3">
              Open lane
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
