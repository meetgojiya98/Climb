"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AIOpsBrief } from "@/components/app/ai-ops-brief"

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

const SURFACE_MAP = [
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
    title: "Resume Summary AI",
    detail: "ATS-safe summary generation with role-fit focus areas and confidence scoring.",
    href: "/app/resumes",
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

  const selectedDevices = useMemo(
    () =>
      (Object.entries(devices) as Array<[Device, boolean]>)
        .filter(([, enabled]) => enabled)
        .map(([device]) => device),
    [devices]
  )

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
