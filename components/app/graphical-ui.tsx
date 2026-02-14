"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp, Gauge, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KpiMetric {
  id: string
  label: string
  value: number
  deltaPct: number
  unit?: string
}

export function LiveKpiWall({ metrics, className }: { metrics: KpiMetric[]; className?: string }) {
  const [streams, setStreams] = useState<Record<string, number[]>>(() => {
    const seeded: Record<string, number[]> = {}
    for (const metric of metrics) {
      const base = Math.max(1, metric.value)
      seeded[metric.id] = Array.from({ length: 12 }, (_, index) => Math.max(1, Math.round(base * (0.85 + index * 0.015))))
    }
    return seeded
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStreams((current) => {
        const next: Record<string, number[]> = { ...current }
        for (const metric of metrics) {
          const existing = current[metric.id] || [metric.value]
          const last = existing[existing.length - 1] || metric.value
          const drift = Math.max(1, Math.round(last * (0.94 + Math.random() * 0.12)))
          next[metric.id] = [...existing.slice(-11), drift]
        }
        return next
      })
    }, 2600)
    return () => window.clearInterval(timer)
  }, [metrics])

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Live KPI Wall</h2>
          <p className="text-xs text-muted-foreground">Auto-refreshing operational metrics with movement signals</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const points = streams[metric.id] || []
          const maxPoint = Math.max(...points, 1)
          const positive = metric.deltaPct >= 0
          return (
            <article key={metric.id} className="rounded-xl border border-border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-2xl font-semibold">
                  {metric.unit === "%" ? `${metric.value.toFixed(0)}%` : `${metric.value.toFixed(0)}${metric.unit || ""}`}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                    positive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                  )}
                >
                  {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(metric.deltaPct).toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 flex items-end gap-1 h-8">
                {points.map((point, index) => (
                  <span
                    key={`${metric.id}-${index}`}
                    className={cn("w-2 rounded-sm", positive ? "bg-green-500/55" : "bg-red-500/55")}
                    style={{ height: `${Math.max(10, Math.round((point / maxPoint) * 32))}px` }}
                  />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export interface FunnelStage {
  id: string
  label: string
  count: number
  href?: string
}

export function InteractiveFunnel({ stages, className }: { stages: FunnelStage[]; className?: string }) {
  const [activeStageId, setActiveStageId] = useState(stages[0]?.id || "")

  useEffect(() => {
    if (!stages.some((stage) => stage.id === activeStageId)) {
      setActiveStageId(stages[0]?.id || "")
    }
  }, [stages, activeStageId])

  const maxCount = Math.max(...stages.map((stage) => stage.count), 1)
  const activeStage = stages.find((stage) => stage.id === activeStageId) || stages[0]
  const activeRate = stages[0]?.count ? Math.round((activeStage?.count || 0) / stages[0].count * 100) : 0

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Interactive Funnel</h2>
          <p className="text-xs text-muted-foreground">Hover stages to inspect conversion flow</p>
        </div>
        <span className="text-xs rounded-full border border-border px-2.5 py-1 text-muted-foreground">Conversion map</span>
      </div>
      <div className="space-y-2">
        {stages.map((stage) => {
          const width = Math.max(18, Math.round((stage.count / maxCount) * 100))
          const active = stage.id === activeStageId
          return (
            <button
              key={stage.id}
              type="button"
              onMouseEnter={() => setActiveStageId(stage.id)}
              onFocus={() => setActiveStageId(stage.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                active ? "border-saffron-500/45 bg-saffron-500/10" : "border-border hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="text-muted-foreground">{stage.count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
      {activeStage && (
        <div className="mt-4 rounded-xl border border-border bg-background/70 p-3 text-sm">
          <p className="text-muted-foreground">Selected stage</p>
          <p className="font-medium mt-1">{activeStage.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeRate}% of top-funnel volume is currently in this stage.</p>
          {activeStage.href && (
            <Link href={activeStage.href} className="inline-flex items-center gap-1.5 mt-2 text-xs text-saffron-700 hover:underline">
              Open stage workspace
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

function heatClass(value: number): string {
  if (value >= 8) return "bg-green-500/90"
  if (value >= 5) return "bg-green-500/60"
  if (value >= 3) return "bg-saffron-500/60"
  if (value >= 1) return "bg-saffron-500/35"
  return "bg-secondary"
}

export function TimelineHeatmap({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const normalized = values.length >= 42 ? values.slice(-42) : [...Array(42 - values.length).fill(0), ...values]
  const recent = normalized.slice(-7).reduce((sum, value) => sum + value, 0)
  const previous = normalized.slice(-14, -7).reduce((sum, value) => sum + value, 0)
  const delta = recent - previous

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-semibold">Timeline Heatmap</h2>
          <p className="text-xs text-muted-foreground">6-week activity and velocity map</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
            delta >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
          )}
        >
          {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {delta >= 0 ? "+" : ""}
          {delta} vs last week
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {normalized.map((value, index) => (
          <div
            key={`heat-${index}`}
            className={cn("h-6 rounded-sm border border-border/40", heatClass(value))}
            title={`Activity score: ${value}`}
          />
        ))}
      </div>
    </section>
  )
}

export interface ScenarioSeries {
  id: string
  label: string
  color: string
  points: number[]
}

function buildPolyline(points: number[], width: number, height: number, maxY: number): string {
  if (points.length === 0) return ""
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = height - (point / Math.max(maxY, 1)) * height
      return `${x},${y}`
    })
    .join(" ")
}

export function ScenarioLineChart({
  series,
  className,
  yLabel = "Offers",
}: {
  series: ScenarioSeries[]
  className?: string
  yLabel?: string
}) {
  const allValues = series.flatMap((item) => item.points)
  const maxY = Math.max(...allValues, 1)
  const width = 620
  const height = 200

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Scenario Simulator Graph</h2>
          <p className="text-xs text-muted-foreground">Compare conservative, base, and aggressive paths</p>
        </div>
        <span className="text-xs text-muted-foreground">Y-axis: {yLabel}</span>
      </div>
      <div className="rounded-xl border border-border bg-background/60 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] h-[220px]">
          {[0, 0.25, 0.5, 0.75, 1].map((line) => {
            const y = height - line * height
            return <line key={`grid-${line}`} x1="0" y1={y} x2={width} y2={y} stroke="currentColor" className="text-border/60" strokeWidth="1" />
          })}
          {series.map((item) => (
            <polyline
              key={item.id}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              points={buildPolyline(item.points, width, height, maxY)}
            />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {series.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}

export interface KeywordCoverage {
  label: string
  resume: number
  jd: number
}

function polygonPoints(skills: KeywordCoverage[], valueKey: "resume" | "jd", radius: number, center: number): string {
  if (skills.length === 0) return ""
  return skills
    .map((skill, index) => {
      const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2
      const ratio = Math.max(0, Math.min(1, skill[valueKey] / 100))
      const x = center + radius * ratio * Math.cos(angle)
      const y = center + radius * ratio * Math.sin(angle)
      return `${x},${y}`
    })
    .join(" ")
}

export function KeywordRadarChart({
  skills,
  className,
}: {
  skills: KeywordCoverage[]
  className?: string
}) {
  const size = 280
  const center = size / 2
  const radius = 100
  const gapSkills = skills.filter((skill) => skill.jd - skill.resume >= 18)

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Resume vs JD Radar</h2>
          <p className="text-xs text-muted-foreground">Keyword and evidence coverage map</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-[280px]">
            {[0.25, 0.5, 0.75, 1].map((level) => (
              <circle
                key={`level-${level}`}
                cx={center}
                cy={center}
                r={radius * level}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1"
              />
            ))}
            {skills.map((skill, index) => {
              const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2
              const x = center + radius * Math.cos(angle)
              const y = center + radius * Math.sin(angle)
              return <line key={`axis-${skill.label}`} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
            })}
            <polygon
              points={polygonPoints(skills, "jd", radius, center)}
              fill="rgba(59,130,246,0.18)"
              stroke="rgba(59,130,246,0.9)"
              strokeWidth="2"
            />
            <polygon
              points={polygonPoints(skills, "resume", radius, center)}
              fill="rgba(245,158,11,0.18)"
              stroke="rgba(245,158,11,0.9)"
              strokeWidth="2"
            />
          </svg>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> JD demand
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Resume evidence
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.label} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium">{skill.label}</p>
                <p className="text-muted-foreground">{skill.resume}% / {skill.jd}%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${skill.resume}%` }} />
              </div>
              <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${skill.jd}%` }} />
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-saffron-500/30 bg-saffron-500/10 p-3 text-xs text-saffron-700">
            <p className="font-medium mb-1">Gap zones</p>
            <p>{gapSkills.length > 0 ? gapSkills.map((item) => item.label).join(", ") : "No major gap zones detected."}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function InterviewAnalyticsPanel({
  scores,
  className,
}: {
  scores: number[]
  className?: string
}) {
  const normalized = scores.length > 0 ? scores.slice(-8) : [58, 61, 65, 67, 70, 72, 76, 78]
  const avg = Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length)
  const clarity = Math.max(40, Math.min(96, avg + 6))
  const pace = Math.max(105, Math.min(180, 118 + avg))
  const filler = Math.max(2, Math.min(18, 16 - Math.round(avg / 8)))
  const maxScore = Math.max(...normalized, 1)

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Interview Analytics Dashboard</h2>
          <p className="text-xs text-muted-foreground">Pace, filler, clarity, and confidence trend</p>
        </div>
        <span className="text-xs rounded-full border border-border px-2.5 py-1">Avg score {avg}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Speaking pace</p>
          <p className="text-xl font-semibold mt-1">{pace} wpm</p>
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.round((pace / 190) * 100))}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Filler words</p>
          <p className="text-xl font-semibold mt-1">{filler}%</p>
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(100, filler * 4)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Clarity score</p>
          <p className="text-xl font-semibold mt-1">{clarity}%</p>
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${clarity}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
        <p className="text-xs text-muted-foreground mb-2">Performance trend</p>
        <div className="flex items-end gap-1.5 h-20">
          {normalized.map((score, index) => (
            <div key={`score-${index}`} className="flex-1 rounded-sm bg-gradient-to-t from-saffron-500/80 to-gold-500/40" style={{ height: `${Math.max(18, Math.round((score / maxScore) * 80))}%` }} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function ConfidenceLayersPanel({
  confidence,
  evidence,
  className,
}: {
  confidence: number
  evidence: string[]
  className?: string
}) {
  const high = Math.round(Math.max(0, Math.min(1, confidence)) * 100)
  const medium = Math.round((100 - high) * 0.65)
  const low = Math.max(0, 100 - high - medium)

  return (
    <section className={cn("rounded-xl border border-border bg-background/70 p-3", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Reasoning Layers</p>
      <div className="mt-2 h-3 rounded-full bg-secondary overflow-hidden flex">
        <span className="h-full bg-green-500" style={{ width: `${high}%` }} />
        <span className="h-full bg-saffron-500" style={{ width: `${medium}%` }} />
        <span className="h-full bg-red-500/70" style={{ width: `${low}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5">High: {high}%</span>
        <span className="rounded-full border border-border px-2 py-0.5">Directional: {medium}%</span>
        <span className="rounded-full border border-border px-2 py-0.5">Risk: {low}%</span>
      </div>
      {evidence.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {evidence.slice(0, 3).map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-lg border border-border bg-background/80 px-2.5 py-2 text-xs text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export interface CommandGraphNode {
  id: string
  label: string
  href: string
  x: number
  y: number
}

export interface CommandGraphEdge {
  from: string
  to: string
}

export function WorkspaceCommandGraph({
  nodes,
  edges,
  className,
}: {
  nodes: CommandGraphNode[]
  edges: CommandGraphEdge[]
  className?: string
}) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, CommandGraphNode>()
    for (const node of nodes) map.set(node.id, node)
    return map
  }, [nodes])

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Workspace Command Graph</h2>
          <p className="text-xs text-muted-foreground">Visual map of module dependencies and action routes</p>
        </div>
        <Gauge className="h-4 w-4 text-saffron-500" />
      </div>
      <div className="relative rounded-xl border border-border bg-background/60 p-3 h-[320px] overflow-hidden">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {edges.map((edge, index) => {
            const from = nodeMap.get(edge.from)
            const to = nodeMap.get(edge.to)
            if (!from || !to) return null
            const mx = (from.x + to.x) / 2
            const my = Math.min(from.y, to.y) - 8
            return (
              <path
                key={`${edge.from}-${edge.to}-${index}`}
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="0.6"
              />
            )
          })}
        </svg>
        {nodes.map((node) => (
          <Link
            key={node.id}
            href={node.href}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm hover:border-saffron-500/40"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

export function SlaCountdownRing({
  appliedAt,
  dueAt,
  status,
}: {
  appliedAt?: string | null
  dueAt?: string | null
  status?: string | null
}) {
  const terminal = status ? ["offer", "rejected", "withdrawn"].includes(status) : false
  if (terminal || !dueAt) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Timer className="h-3.5 w-3.5" />
        Closed
      </div>
    )
  }

  const now = Date.now()
  const dueMs = new Date(dueAt).getTime()
  const appliedMs = appliedAt ? new Date(appliedAt).getTime() : dueMs - 7 * 24 * 60 * 60 * 1000
  const total = Math.max(1, dueMs - appliedMs)
  const elapsed = Math.max(0, now - appliedMs)
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  const overdue = now > dueMs
  const days = Math.ceil((dueMs - now) / (1000 * 60 * 60 * 24))

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="h-7 w-7 rounded-full border border-border"
        style={{
          background: `conic-gradient(${overdue ? "rgba(239,68,68,0.9)" : "rgba(245,158,11,0.85)"} ${pct}%, rgba(148,163,184,0.25) ${pct}% 100%)`,
        }}
      />
      <span className={cn("text-[11px]", overdue ? "text-red-600" : "text-muted-foreground")}>
        {overdue ? `${Math.abs(days)}d late` : `${Math.max(days, 0)}d left`}
      </span>
    </div>
  )
}
