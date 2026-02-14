"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { buildDefaultRollout, getEnterpriseFeatureById, type EnterpriseFeatureStatus } from "@/lib/enterprise-feature-suite"

type SprintPlan = {
  featureId: string
  title: string
  summary: string
  sprintDays: Array<{
    day: string
    objective: string
    actions: string[]
    successMetric: string
  }>
  quickPrompts: string[]
  confidence: number
}

type FeatureExecutionPackage = {
  featureId: string
  title: string
  lane: string
  focus: "speed" | "quality" | "conversion" | "risk"
  generatedAt: string
  summary: string
  valueScore: number
  riskLevel: "low" | "medium" | "high"
  kpiTargets: Array<{
    name: string
    current: string
    target: string
    trend: "up" | "down" | "stable"
  }>
  actions: Array<{
    id: string
    title: string
    detail: string
    moduleHref: string
    priority: "high" | "medium" | "low"
    dueAt: string
    owner: string
    kpi: string
    checklist: string[]
  }>
  evidence: Array<{
    source: string
    detail: string
    href: string
  }>
  quickPrompts: string[]
}

type FeatureRunHistoryItem = {
  id: string
  featureId: string | null
  runKind: string
  payload: Record<string, any>
  createdAt: string
}

const STATUS_OPTIONS: Array<{ value: EnterpriseFeatureStatus; label: string }> = [
  { value: "live", label: "Live" },
  { value: "in_progress", label: "In Progress" },
  { value: "planned", label: "Planned" },
  { value: "backlog", label: "Backlog" },
]

export default function EnterpriseFeatureWorkbenchPage() {
  const params = useParams<{ featureId: string }>()
  const featureId = String(params?.featureId || "")
  const feature = useMemo(() => getEnterpriseFeatureById(featureId), [featureId])

  const [status, setStatus] = useState<EnterpriseFeatureStatus>("live")
  const [priority, setPriority] = useState(88)
  const [owner, setOwner] = useState(() => buildDefaultRollout(featureId).owner)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [runningSprint, setRunningSprint] = useState(false)
  const [runningExecution, setRunningExecution] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [sprint, setSprint] = useState<SprintPlan | null>(null)
  const [execution, setExecution] = useState<FeatureExecutionPackage | null>(null)
  const [runHistory, setRunHistory] = useState<FeatureRunHistoryItem[]>([])

  useEffect(() => {
    if (!featureId) return
    void loadRunHistory()
  }, [featureId])

  if (!feature) {
    return (
      <div className="section-shell section-stack">
        <div className="card-elevated p-8 text-center space-y-3">
          <h1 className="font-display text-2xl">Feature not found</h1>
          <p className="text-sm text-muted-foreground">This enterprise feature ID does not exist in the suite catalog.</p>
          <Link href="/app/enterprise-lab" className="btn-primary inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Back to Enterprise Lab
          </Link>
        </div>
      </div>
    )
  }

  const saveFeature = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/enterprise/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            {
              featureId: feature.id,
              status,
              priority,
              owner,
              notes,
            },
          ],
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to update feature")
      toast.success("Feature settings updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update feature"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const generateSprint = async () => {
    setRunningSprint(true)
    try {
      const response = await fetch(`/api/enterprise/features/${feature.id}/sprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to generate sprint")
      setSprint(data.sprint)
      toast.success("Sprint generated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate sprint"
      toast.error(message)
    } finally {
      setRunningSprint(false)
    }
  }

  const executeFeature = async () => {
    if (!feature) return

    setRunningExecution(true)
    try {
      const response = await fetch(`/api/enterprise/features/${feature.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          focus: "conversion",
          createReminders: true,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to execute feature")
      setExecution(data.execution || null)
      toast.success("Execution package generated")
      void loadRunHistory()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to execute feature"
      toast.error(message)
    } finally {
      setRunningExecution(false)
    }
  }

  const loadRunHistory = async () => {
    if (!featureId) return

    setLoadingRuns(true)
    try {
      const response = await fetch(`/api/enterprise/features/${featureId}/runs?limit=15`, { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to load run history")

      const runs = Array.isArray(data.runs) ? data.runs : []
      setRunHistory(runs)
      const latestExecution = runs.find((run: FeatureRunHistoryItem) => run?.payload?.kind === "feature_execution")
      if (latestExecution?.payload?.execution) {
        setExecution(latestExecution.payload.execution as FeatureExecutionPackage)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load run history"
      toast.error(message)
    } finally {
      setLoadingRuns(false)
    }
  }

  return (
    <div className="section-shell section-stack-lg">
      <section className="card-elevated p-6 sm:p-8 section-stack">
        <div className="surface-header gap-5">
          <div>
            <Link href="/app/enterprise-lab" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Enterprise Lab
            </Link>
            <h1 className="font-display text-3xl tracking-tight">{feature.title}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{feature.summary}</p>
          </div>
          <span className="badge border border-saffron-500/30 bg-saffron-500/10 text-saffron-700 dark:text-saffron-300">
            <Sparkles className="w-3.5 h-3.5" />
            {feature.category}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/20 p-4">
          <p className="text-sm text-foreground">Impact: {feature.impact}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {feature.kpis.map((kpi) => (
              <span key={kpi} className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3 mr-1 text-saffron-500" />
                {kpi}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as EnterpriseFeatureStatus)} className="input-field py-2">
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Owner</label>
            <input value={owner} onChange={(event) => setOwner(event.target.value)} className="input-field py-2" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Priority</span>
            <span>{priority}</span>
          </div>
          <input type="range" min={0} max={100} value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="w-full" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Execution notes</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="input-field min-h-[110px]"
            placeholder="Add notes or constraints for this feature run."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveFeature} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Feature
          </button>
          <button type="button" onClick={generateSprint} disabled={runningSprint} className="btn-saffron disabled:opacity-50">
            {runningSprint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Generate 7-Day Sprint
          </button>
          <button type="button" onClick={executeFeature} disabled={runningExecution} className="btn-outline disabled:opacity-50">
            {runningExecution ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Run Feature Engine
          </button>
          <Link href={feature.defaultHref} className="btn-outline">
            Open Linked Module
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="card-elevated p-6 sm:p-8 section-stack">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Execution Blueprint</h2>
          <Rocket className="w-5 h-5 text-saffron-500" />
        </div>

        {!execution ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-5 text-sm text-muted-foreground">
            Run Feature Engine to generate actionable tasks, KPI targets, and value scoring for this feature.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background/75 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">Feature runtime output</h3>
                <p className="text-xs text-muted-foreground mt-1">{execution.summary}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full border border-border px-2 py-0.5">Value {execution.valueScore}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 uppercase tracking-wide ${
                    execution.riskLevel === "high"
                      ? "border-red-500/30 text-red-600 bg-red-500/10"
                      : execution.riskLevel === "medium"
                        ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                        : "border-green-500/30 text-green-600 bg-green-500/10"
                  }`}
                >
                  {execution.riskLevel} risk
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {execution.actions.map((action) => (
                <Link key={action.id} href={action.moduleHref} className="rounded-lg border border-border bg-secondary/20 p-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{action.title}</p>
                    <span className="text-[10px] uppercase text-muted-foreground">{action.priority}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{action.kpi}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Due {new Date(action.dueAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">KPI targets</p>
              {execution.kpiTargets.map((item) => (
                <p key={item.name} className="text-xs text-muted-foreground">
                  {item.name}: {item.current} {"->"} {item.target}
                </p>
              ))}
            </div>
          </div>
        )}

        {!sprint ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-5 text-sm text-muted-foreground">
            Generate a sprint to produce day-by-day actions, success metrics, and AI prompts for this feature.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <h3 className="font-medium">{sprint.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{sprint.summary}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {sprint.sprintDays.map((day) => (
                <article key={`${day.day}-${day.objective}`} className="rounded-xl border border-border bg-background/80 p-4 space-y-2">
                  <h4 className="font-medium text-sm">{day.day}</h4>
                  <p className="text-xs text-muted-foreground">{day.objective}</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {day.actions.map((action) => (
                      <li key={action} className="flex gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-saffron-500" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-saffron-600 dark:text-saffron-300">Metric: {day.successMetric}</p>
                </article>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Copilot prompts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sprint.quickPrompts.map((prompt) => (
                  <button key={prompt} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary/80 transition-colors">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card-elevated p-6 sm:p-8 section-stack">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Run History</h2>
          {loadingRuns ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {runHistory.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            No runs yet. Run a sprint or feature execution to create history.
          </div>
        ) : (
          <div className="space-y-2">
            {runHistory.slice(0, 8).map((run) => (
              <div key={run.id} className="rounded-lg border border-border bg-background/75 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {run.payload?.kind === "feature_execution" ? "Feature execution" : run.runKind}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                </div>
                {run.payload?.execution?.summary ? (
                  <p className="mt-1 text-xs text-muted-foreground">{String(run.payload.execution.summary)}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
