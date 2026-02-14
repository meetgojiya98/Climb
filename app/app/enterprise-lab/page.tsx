"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  ENTERPRISE_FEATURE_COUNT,
  ENTERPRISE_FEATURE_CATEGORY_ORDER,
  type EnterpriseFeatureCategory,
  type EnterpriseFeatureStatus,
} from "@/lib/enterprise-feature-suite"

type FeatureItem = {
  id: string
  title: string
  category: EnterpriseFeatureCategory
  summary: string
  impact: string
  defaultHref: string
  kpis: string[]
  sprintTemplate: string[]
  featureId: string
  status: EnterpriseFeatureStatus
  priority: number
  owner: string
  notes: string
  lastRunAt: string | null
  updatedAt: string | null
}

type FeatureSummary = {
  total: number
  live: number
  inProgress: number
  planned: number
  backlog: number
  avgPriority: number
  completionPct: number
}

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

type RoadmapPlan = {
  objective: string
  horizonWeeks: number
  summary: string
  windows: Array<{
    name: string
    weeks: string
    focus: string
    outcomes: string[]
    featureIds: string[]
  }>
  quickPrompts: string[]
  confidence: number
}

const STATUS_OPTIONS: Array<{ value: EnterpriseFeatureStatus; label: string }> = [
  { value: "live", label: "Live" },
  { value: "in_progress", label: "In Progress" },
  { value: "planned", label: "Planned" },
  { value: "backlog", label: "Backlog" },
]

const STATUS_COLORS: Record<EnterpriseFeatureStatus, string> = {
  live: "text-green-500 border-green-500/30 bg-green-500/10",
  in_progress: "text-cyan-500 border-cyan-500/30 bg-cyan-500/10",
  planned: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  backlog: "text-muted-foreground border-border bg-secondary/40",
}

export default function EnterpriseLabPage() {
  const [loading, setLoading] = useState(true)
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null)
  const [activatingAll, setActivatingAll] = useState(false)
  const [features, setFeatures] = useState<FeatureItem[]>([])
  const [summary, setSummary] = useState<FeatureSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<EnterpriseFeatureCategory | "All">("All")
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
  const [sprintByFeature, setSprintByFeature] = useState<Record<string, SprintPlan>>({})
  const [sprintLoadingFeatureId, setSprintLoadingFeatureId] = useState<string | null>(null)
  const [executionByFeature, setExecutionByFeature] = useState<Record<string, FeatureExecutionPackage>>({})
  const [executionLoadingFeatureId, setExecutionLoadingFeatureId] = useState<string | null>(null)
  const [roadmapObjective, setRoadmapObjective] = useState(
    "Roll out key features in clear weekly steps and improve results."
  )
  const [roadmapHorizonWeeks, setRoadmapHorizonWeeks] = useState(14)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmap, setRoadmap] = useState<RoadmapPlan | null>(null)
  const totalFeatureCount = summary?.total || ENTERPRISE_FEATURE_COUNT

  const featureLookup = useMemo(
    () => Object.fromEntries(features.map((feature) => [feature.id, feature])),
    [features]
  )

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      if (category !== "All" && feature.category !== category) return false
      const query = searchQuery.trim().toLowerCase()
      if (!query) return true
      const haystack = [feature.title, feature.summary, feature.impact, feature.category, feature.kpis.join(" ")]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [features, category, searchQuery])

  useEffect(() => {
    void loadFeatures()
  }, [])

  const loadFeatures = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/enterprise/features", { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not load features")

      const nextFeatures = Array.isArray(data.features) ? data.features : []
      setFeatures(nextFeatures)
      setSummary(data.summary || null)
      setSelectedFeatureIds(nextFeatures.map((feature: FeatureItem) => feature.id))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load features"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const mutateFeatureLocal = (featureId: string, patch: Partial<FeatureItem>) => {
    setFeatures((previous) =>
      previous.map((feature) =>
        feature.id === featureId
          ? {
              ...feature,
              ...patch,
            }
          : feature
      )
    )
  }

  const saveFeature = async (featureId: string) => {
    const feature = featureLookup[featureId]
    if (!feature) return

    setSavingFeatureId(featureId)
    try {
      const response = await fetch("/api/enterprise/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            {
              featureId: feature.id,
              status: feature.status,
              priority: feature.priority,
              owner: feature.owner,
              notes: feature.notes,
            },
          ],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not save feature")

      setFeatures(Array.isArray(data.features) ? data.features : features)
      setSummary(data.summary || summary)
      toast.success(`${feature.title} updated`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save feature"
      toast.error(message)
    } finally {
      setSavingFeatureId(null)
    }
  }

  const activateAllFeatures = async () => {
    setActivatingAll(true)
    try {
      const response = await fetch("/api/enterprise/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activateAll: true,
          status: "live",
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not activate all features")

      setFeatures(Array.isArray(data.features) ? data.features : features)
      setSummary(data.summary || summary)
      toast.success(`All ${totalFeatureCount} features are now live`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not activate all features"
      toast.error(message)
    } finally {
      setActivatingAll(false)
    }
  }

  const runSprint = async (featureId: string) => {
    const feature = featureLookup[featureId]
    if (!feature) return

    setSprintLoadingFeatureId(featureId)
    try {
      const response = await fetch(`/api/enterprise/features/${featureId}/sprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: feature.notes }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not generate plan")

      setSprintByFeature((previous) => ({
        ...previous,
        [featureId]: data.sprint,
      }))
      mutateFeatureLocal(featureId, {
        status: feature.status === "live" ? "live" : "in_progress",
        lastRunAt: data.generatedAt || new Date().toISOString(),
      })
      toast.success(`Plan generated for ${feature.title}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate plan"
      toast.error(message)
    } finally {
      setSprintLoadingFeatureId(null)
    }
  }

  const runFeature = async (featureId: string) => {
    const feature = featureLookup[featureId]
    if (!feature) return

    setExecutionLoadingFeatureId(featureId)
    try {
      const response = await fetch(`/api/enterprise/features/${featureId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: feature.notes,
          focus: "conversion",
          createReminders: true,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not execute feature")

      if (data.execution) {
        setExecutionByFeature((previous) => ({
          ...previous,
          [featureId]: data.execution,
        }))
      }
      mutateFeatureLocal(featureId, {
        status: feature.status === "live" ? "live" : "in_progress",
        lastRunAt: data.generatedAt || new Date().toISOString(),
      })
      toast.success(`Execution package generated for ${feature.title}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not execute feature"
      toast.error(message)
    } finally {
      setExecutionLoadingFeatureId(null)
    }
  }

  const generateRoadmap = async () => {
    const scoped = selectedFeatureIds.filter((featureId) => Boolean(featureLookup[featureId]))
    if (scoped.length === 0) {
      toast.error("Select at least one feature to create a roadmap")
      return
    }

    setRoadmapLoading(true)
    try {
      const response = await fetch("/api/enterprise/features/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: roadmapObjective,
          horizonWeeks: roadmapHorizonWeeks,
          featureIds: scoped,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.error || "Could not generate roadmap")
      setRoadmap(data.roadmap)
      toast.success("Roadmap generated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate roadmap"
      toast.error(message)
    } finally {
      setRoadmapLoading(false)
    }
  }

  const toggleFeatureSelection = (featureId: string) => {
    setSelectedFeatureIds((previous) =>
      previous.includes(featureId)
        ? previous.filter((id) => id !== featureId)
        : [...previous, featureId]
    )
  }

  if (loading) {
    return (
      <div className="section-shell section-stack">
        <div className="card-elevated p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-saffron-500" />
          <span className="text-sm text-muted-foreground">Loading feature suite...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="section-shell section-stack-lg">
      <section className="card-elevated overflow-hidden">
        <div className="relative p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white">
          <div className="absolute top-[-120px] right-[-90px] h-72 w-72 rounded-full bg-saffron-500/20 blur-3xl" />
          <div className="absolute bottom-[-140px] left-[-100px] h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <span className="badge border border-white/20 bg-white/10 text-white">
              <Sparkles className="w-3.5 h-3.5" />
              Feature Suite
            </span>

            <div className="surface-header gap-5">
              <div className="max-w-3xl">
                <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                  All {totalFeatureCount} features are ready.
                </h1>
                <p className="mt-3 text-sm sm:text-base text-white/75">
                  Manage feature status, run AI plans, and build a roadmap from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={activateAllFeatures}
                  disabled={activatingAll}
                  className="btn-saffron disabled:opacity-50"
                >
                  {activatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Activate All ({totalFeatureCount})
                </button>
                <button type="button" onClick={generateRoadmap} disabled={roadmapLoading} className="btn-outline text-white border-white/20 bg-white/5 hover:bg-white/10">
                  {roadmapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Build Roadmap
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs text-white/70 uppercase tracking-wide">Completion</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.completionPct ?? 0}%</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs text-white/70 uppercase tracking-wide">Live Features</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.live ?? 0}/{totalFeatureCount}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs text-white/70 uppercase tracking-wide">Average Priority</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.avgPriority ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs text-white/70 uppercase tracking-wide">Selected</p>
                <p className="mt-2 text-2xl font-semibold">{selectedFeatureIds.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6 section-stack">
        <div className="surface-header gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4 text-saffron-500" />
            Feature Filters
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                category === "All" ? "border-saffron-500/35 bg-saffron-500/10 text-saffron-700 dark:text-saffron-300" : "border-border hover:bg-secondary"
              )}
              onClick={() => setCategory("All")}
            >
              All
            </button>
            {ENTERPRISE_FEATURE_CATEGORY_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  category === item ? "border-saffron-500/35 bg-saffron-500/10 text-saffron-700 dark:text-saffron-300" : "border-border hover:bg-secondary"
                )}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, category, KPI, or impact"
            className="input-field pl-10"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredFeatures.map((feature) => {
          const sprint = sprintByFeature[feature.id]
          const execution = executionByFeature[feature.id]
          const isSelected = selectedFeatureIds.includes(feature.id)
          return (
            <article key={feature.id} className="card-interactive p-5 section-stack">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl leading-tight">{feature.title}</h2>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[feature.status])}>
                      {feature.status.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {feature.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{feature.summary}</p>
                  <p className="text-xs text-foreground/90 mt-2">Impact: {feature.impact}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFeatureSelection(feature.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Scope
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    value={feature.status}
                    onChange={(event) => mutateFeatureLocal(feature.id, { status: event.target.value as EnterpriseFeatureStatus })}
                    className="input-field py-2"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <input
                    value={feature.owner}
                    onChange={(event) => mutateFeatureLocal(feature.id, { owner: event.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Priority</span>
                  <span>{feature.priority}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={feature.priority}
                  onChange={(event) => mutateFeatureLocal(feature.id, { priority: Number(event.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  value={feature.notes}
                  onChange={(event) => mutateFeatureLocal(feature.id, { notes: event.target.value })}
                  className="input-field min-h-[88px]"
                  placeholder="Add notes, constraints, or comments."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {feature.kpis.map((kpi) => (
                  <span key={kpi} className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    <Target className="w-3 h-3 mr-1 text-saffron-500" />
                    {kpi}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveFeature(feature.id)}
                  disabled={savingFeatureId === feature.id}
                  className="btn-primary disabled:opacity-50"
                >
                  {savingFeatureId === feature.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => runSprint(feature.id)}
                  disabled={sprintLoadingFeatureId === feature.id}
                  className="btn-outline"
                >
                  {sprintLoadingFeatureId === feature.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  Run 7-Day Plan
                </button>
                <button
                  type="button"
                  onClick={() => runFeature(feature.id)}
                  disabled={executionLoadingFeatureId === feature.id}
                  className="btn-outline"
                >
                  {executionLoadingFeatureId === feature.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Run Feature
                </button>
                <Link href={`/app/enterprise-lab/${feature.id}`} className="btn-outline">
                  Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href={feature.defaultHref} className="btn-outline">
                  Open Module
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {feature.lastRunAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last run: {new Date(feature.lastRunAt).toLocaleString()}
                </p>
              )}

              {execution && (
                <div className="rounded-xl border border-border bg-background/75 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">Execution package</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full border border-border px-2 py-0.5">Value {execution.valueScore}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 uppercase tracking-wide",
                          execution.riskLevel === "high"
                            ? "border-red-500/30 text-red-600 bg-red-500/10"
                            : execution.riskLevel === "medium"
                              ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                              : "border-green-500/30 text-green-600 bg-green-500/10"
                        )}
                      >
                        {execution.riskLevel} risk
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">{execution.summary}</p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {execution.actions.slice(0, 4).map((action) => (
                      <Link
                        key={action.id}
                        href={action.moduleHref}
                        className="rounded-lg border border-border bg-secondary/20 p-3 hover:bg-secondary/35 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">{action.title}</p>
                          <span className="text-[10px] uppercase text-muted-foreground">{action.priority}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{action.kpi}</p>
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Evidence</p>
                    {execution.evidence.slice(0, 2).map((item) => (
                      <p key={item.source} className="text-[11px] text-muted-foreground">
                        {item.source}: {item.detail}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {sprint && (
                <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                  <div>
                    <h3 className="font-medium">{sprint.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{sprint.summary}</p>
                  </div>
                  <div className="space-y-2">
                    {sprint.sprintDays.slice(0, 3).map((day) => (
                      <div key={`${sprint.featureId}-${day.day}`} className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold">{day.day} - {day.objective}</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {day.actions.slice(0, 2).map((action) => (
                            <li key={action} className="flex gap-1.5">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-saffron-500" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-saffron-600 dark:text-saffron-300 mt-2">Success metric: {day.successMetric}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </section>

      <section className="card-elevated p-5 sm:p-6 section-stack">
        <div className="surface-header gap-4">
          <div>
            <h2 className="font-display text-2xl">Roadmap Planner</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create a step-by-step plan for selected features.
            </p>
          </div>
          <button type="button" onClick={generateRoadmap} disabled={roadmapLoading} className="btn-saffron disabled:opacity-50">
            {roadmapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Build Roadmap
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr]">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Roadmap Goal</label>
            <textarea
              value={roadmapObjective}
              onChange={(event) => setRoadmapObjective(event.target.value)}
              className="input-field min-h-[88px]"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">Timeline (weeks)</label>
            <input
              type="range"
              min={6}
              max={26}
              value={roadmapHorizonWeeks}
              onChange={(event) => setRoadmapHorizonWeeks(Number(event.target.value))}
              className="w-full"
            />
            <p className="text-sm font-medium">{roadmapHorizonWeeks} weeks</p>
            <p className="text-xs text-muted-foreground">{selectedFeatureIds.length} selected</p>
          </div>
        </div>

        {roadmap && (
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="font-semibold">{roadmap.objective}</h3>
              <p className="text-sm text-muted-foreground mt-1">{roadmap.summary}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {roadmap.windows.map((window) => (
                <div key={window.name} className="rounded-xl border border-border bg-background/80 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{window.name} - {window.weeks}</p>
                  <h4 className="font-medium">{window.focus}</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {window.outcomes.map((outcome) => (
                      <li key={outcome} className="flex gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-saffron-500" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <p className="text-[11px] text-muted-foreground">Features</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {window.featureIds.map((featureId) => (
                        <span key={featureId} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                          {featureLookup[featureId]?.title || featureId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Prompts</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {roadmap.quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="text-left rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary/70 transition-colors">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
