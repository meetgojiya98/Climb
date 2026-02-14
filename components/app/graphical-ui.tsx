"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Gauge,
  Timer,
  MapPin,
  Pause,
  Play,
  Presentation,
  Sparkles,
  Wand2,
} from "lucide-react"
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

export interface SankeyNode {
  id: string
  label: string
  column: number
}

export interface SankeyLink {
  from: string
  to: string
  value: number
}

export function ConversionSankeyChart({
  nodes,
  links,
  className,
}: {
  nodes: SankeyNode[]
  links: SankeyLink[]
  className?: string
}) {
  const width = 760
  const height = 280
  const maxValue = Math.max(...links.map((item) => item.value), 1)
  const [activeLink, setActiveLink] = useState<string | null>(null)

  const nodePositions = useMemo(() => {
    const grouped = new Map<number, SankeyNode[]>()
    for (const node of nodes) {
      const bucket = grouped.get(node.column) || []
      bucket.push(node)
      grouped.set(node.column, bucket)
    }
    const columns = Array.from(grouped.keys()).sort((a, b) => a - b)
    const maxColumn = Math.max(...columns, 1)
    const positions = new Map<string, { x: number; y: number }>()

    for (const column of columns) {
      const items = grouped.get(column) || []
      items.sort((a, b) => a.label.localeCompare(b.label))
      const step = height / Math.max(items.length + 1, 2)
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const x = 80 + (column / Math.max(maxColumn, 1)) * (width - 160)
        const y = step * (i + 1)
        positions.set(item.id, { x, y })
      }
    }
    return positions
  }, [height, nodes, width])

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Sankey Conversion Flow</h2>
          <p className="text-xs text-muted-foreground">Volume-weighted movement from source to offer</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Flow map</span>
      </div>
      <div className="rounded-xl border border-border bg-background/60 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] h-[300px]">
          {links.map((link, index) => {
            const source = nodePositions.get(link.from)
            const target = nodePositions.get(link.to)
            if (!source || !target) return null
            const key = `${link.from}-${link.to}-${index}`
            const active = !activeLink || activeLink === key
            const strokeWidth = Math.max(4, Math.round((link.value / maxValue) * 22))
            const midX = (source.x + target.x) / 2
            const path = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`
            return (
              <path
                key={key}
                d={path}
                fill="none"
                stroke="url(#sankeyGradient)"
                strokeOpacity={active ? 0.95 : 0.2}
                strokeWidth={strokeWidth}
                onMouseEnter={() => setActiveLink(key)}
                onMouseLeave={() => setActiveLink(null)}
              />
            )
          })}
          <defs>
            <linearGradient id="sankeyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          {nodes.map((node) => {
            const position = nodePositions.get(node.id)
            if (!position) return null
            return (
              <g key={node.id}>
                <rect
                  x={position.x - 48}
                  y={position.y - 16}
                  width="96"
                  height="32"
                  rx="8"
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--border))"
                />
                <text x={position.x} y={position.y + 5} textAnchor="middle" fontSize="11" fill="currentColor" className="text-foreground">
                  {node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

export interface ReplayFrame {
  label: string
  stages: Array<{ label: string; value: number }>
}

export function PipelineReplay({
  frames,
  className,
}: {
  frames: ReplayFrame[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const current = frames[Math.max(0, Math.min(index, frames.length - 1))]
  const maxValue = Math.max(1, ...frames.flatMap((frame) => frame.stages.map((stage) => stage.value)))

  useEffect(() => {
    if (!playing || frames.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % frames.length)
    }, 1400)
    return () => window.clearInterval(timer)
  }, [frames.length, playing])

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Time-Lapse Pipeline Replay</h2>
          <p className="text-xs text-muted-foreground">Playback of stage movement over time</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-background/65 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{current?.label || "Frame"}</span>
          <span>Frame {index + 1}/{Math.max(frames.length, 1)}</span>
        </div>
        <div className="space-y-2">
          {(current?.stages || []).map((stage) => (
            <div key={`${current?.label}-${stage.label}`} className="rounded-lg border border-border bg-background/80 p-2.5">
              <div className="flex items-center justify-between text-sm">
                <span>{stage.label}</span>
                <span className="font-medium">{stage.value}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${Math.max(6, Math.round((stage.value / maxValue) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={index}
          onChange={(event) => {
            setPlaying(false)
            setIndex(Number(event.target.value))
          }}
          className="w-full mt-3 accent-saffron-500"
        />
      </div>
    </section>
  )
}

export interface OpportunityPoint {
  id: string
  city: string
  x: number
  y: number
  roles: number
  responseRate: number
  salaryBand: string
}

export function GeoOpportunityMap({
  points,
  className,
}: {
  points: OpportunityPoint[]
  className?: string
}) {
  const [activePointId, setActivePointId] = useState(points[0]?.id || "")
  const active = points.find((point) => point.id === activePointId) || points[0]

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Geo Opportunity Map</h2>
          <p className="text-xs text-muted-foreground">Role density, response rate, and salary hotspots</p>
        </div>
        <MapPin className="h-4 w-4 text-saffron-500" />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="relative rounded-xl border border-border bg-gradient-to-br from-background to-secondary/30 h-[260px] overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-25" />
          {points.map((point) => (
            <button
              key={point.id}
              type="button"
              onClick={() => setActivePointId(point.id)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 transition-all",
                activePointId === point.id ? "h-5 w-5 bg-saffron-500 shadow-[0_0_0_8px_rgba(245,158,11,0.2)]" : "h-4 w-4 bg-blue-500/85"
              )}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              aria-label={point.city}
            />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-3">
          {active ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{active.city}</p>
              <p className="text-muted-foreground">Open roles: {active.roles}</p>
              <p className="text-muted-foreground">Response rate: {active.responseRate}%</p>
              <p className="text-muted-foreground">Salary zone: {active.salaryBand}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-saffron-500" />
                Hotspot confidence high
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a city point.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function SkillRoleFitMatrix3D({
  skills,
  roles,
  values,
  className,
}: {
  skills: string[]
  roles: string[]
  values: number[][]
  className?: string
}) {
  const [tiltX, setTiltX] = useState(18)
  const [tiltY, setTiltY] = useState(-16)
  const safeValues = values.length > 0 ? values : skills.map(() => roles.map(() => 50))

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">3D Skill-Role Fit Matrix</h2>
          <p className="text-xs text-muted-foreground">Rotatable fit surface across skills and target roles</p>
        </div>
        <Wand2 className="h-4 w-4 text-saffron-500" />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-xl border border-border bg-background/70 p-3 [perspective:900px]">
          <div
            className="grid gap-1 rounded-xl border border-border bg-secondary/20 p-2 transition-transform duration-300 [transform-style:preserve-3d]"
            style={{
              gridTemplateColumns: `120px repeat(${roles.length}, minmax(0,1fr))`,
              transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            }}
          >
            <div />
            {roles.map((role) => (
              <div key={role} className="text-[11px] font-medium text-center text-muted-foreground">{role}</div>
            ))}
            {skills.map((skill, rowIndex) => (
              <div key={skill} className="contents">
                <div className="text-[11px] font-medium text-muted-foreground">{skill}</div>
                {roles.map((role, colIndex) => {
                  const value = Math.max(0, Math.min(100, safeValues[rowIndex]?.[colIndex] ?? 50))
                  return (
                    <div
                      key={`${skill}-${role}`}
                      className="h-9 rounded-md border border-border/60 flex items-center justify-center text-[11px] font-medium"
                      style={{
                        background: `linear-gradient(180deg, rgba(34,197,94,${value / 160}) 0%, rgba(245,158,11,${value / 200}) 100%)`,
                      }}
                    >
                      {value}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Matrix rotation</p>
          <label className="text-xs text-muted-foreground block">Tilt X: {tiltX}°</label>
          <input type="range" min={-30} max={30} value={tiltX} onChange={(event) => setTiltX(Number(event.target.value))} className="w-full accent-saffron-500" />
          <label className="text-xs text-muted-foreground block">Tilt Y: {tiltY}°</label>
          <input type="range" min={-30} max={30} value={tiltY} onChange={(event) => setTiltY(Number(event.target.value))} className="w-full accent-saffron-500" />
          <p className="text-xs text-muted-foreground pt-1">Higher cells indicate stronger evidence-fit and readiness.</p>
        </div>
      </div>
    </section>
  )
}

export function ScenarioRibbonTimeline({
  series,
  className,
}: {
  series: ScenarioSeries[]
  className?: string
}) {
  const width = 760
  const height = 220
  const maxY = Math.max(...series.flatMap((item) => item.points), 1)

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Scenario Ribbon Timeline</h2>
          <p className="text-xs text-muted-foreground">Animated ribbons for conservative/base/aggressive outlooks</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background/65 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] h-[230px]">
          {[0.2, 0.4, 0.6, 0.8, 1].map((line) => (
            <line key={`rb-grid-${line}`} x1="0" y1={height - line * height} x2={width} y2={height - line * height} stroke="currentColor" className="text-border/50" />
          ))}
          {series.map((item, index) => (
            <polyline
              key={`ribbon-${item.id}`}
              points={buildPolyline(item.points, width, height, maxY)}
              fill="none"
              stroke={item.color}
              strokeWidth={16 - index * 3}
              strokeOpacity={0.25 + index * 0.25}
              className="animate-pulse"
            />
          ))}
          {series.map((item) => (
            <polyline
              key={`line-${item.id}`}
              points={buildPolyline(item.points, width, height, maxY)}
              fill="none"
              stroke={item.color}
              strokeWidth={2}
            />
          ))}
        </svg>
      </div>
    </section>
  )
}

export interface DecisionBranch {
  id: string
  title: string
  confidence: number
  explanation: string
  href?: string
  children: string[]
}

export function AIDecisionTreeView({
  rootLabel,
  branches,
  className,
}: {
  rootLabel: string
  branches: DecisionBranch[]
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-background/70 p-3", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Decision Tree</p>
      <div className="mt-2 rounded-lg border border-border bg-secondary/25 p-2.5">
        <p className="text-sm font-medium">{rootLabel}</p>
      </div>
      <div className="mt-2 space-y-2">
        {branches.slice(0, 3).map((branch) => (
          <div key={branch.id} className="rounded-lg border border-border bg-background/80 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{branch.title}</p>
              <span className="text-[11px] text-muted-foreground">{Math.round(branch.confidence * 100)}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{branch.explanation}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {branch.children.slice(0, 3).map((child) => (
                <span key={`${branch.id}-${child}`} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {child}
                </span>
              ))}
            </div>
            {branch.href && (
              <Link href={branch.href} className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-saffron-700 hover:underline">
                Open lane <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function CommandCanvas({
  nodes,
  edges,
  className,
}: {
  nodes: CommandGraphNode[]
  edges: CommandGraphEdge[]
  className?: string
}) {
  const [activeNodeId, setActiveNodeId] = useState(nodes[0]?.id || "")
  const nodeMap = useMemo(() => {
    const map = new Map<string, CommandGraphNode>()
    for (const node of nodes) map.set(node.id, node)
    return map
  }, [nodes])

  const activeEdges = edges.filter((edge) => edge.from === activeNodeId || edge.to === activeNodeId)

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Command Canvas</h2>
          <p className="text-xs text-muted-foreground">Node-based workflow for rapid action chaining</p>
        </div>
      </div>
      <div className="relative rounded-xl border border-border bg-background/60 p-3 h-[340px] overflow-hidden">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {edges.map((edge, index) => {
            const from = nodeMap.get(edge.from)
            const to = nodeMap.get(edge.to)
            if (!from || !to) return null
            const active = edge.from === activeNodeId || edge.to === activeNodeId
            return (
              <line
                key={`${edge.from}-${edge.to}-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "rgba(245,158,11,0.9)" : "rgba(148,163,184,0.4)"}
                strokeWidth={active ? 1.1 : 0.6}
              />
            )
          })}
        </svg>
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => setActiveNodeId(node.id)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              activeNodeId === node.id
                ? "border-saffron-500/45 bg-saffron-500/10 text-saffron-700"
                : "border-border bg-background/90 hover:border-saffron-500/30"
            )}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.label}
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Active path edges: {activeEdges.length}
      </div>
    </section>
  )
}

export type MotionTheme = "minimal" | "cinematic" | "enterprise"

export function MotionThemeSelector({
  value,
  onChange,
  className,
}: {
  value: MotionTheme
  onChange: (value: MotionTheme) => void
  className?: string
}) {
  const options: MotionTheme[] = ["minimal", "cinematic", "enterprise"]
  return (
    <section className={cn("rounded-xl border border-border bg-background/70 p-3", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Adaptive Motion Theme</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-xs capitalize transition-colors",
              value === option ? "border-saffron-500/45 bg-saffron-500/10 text-saffron-700" : "border-border hover:bg-secondary"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  )
}

export interface StoryboardSlide {
  id: string
  title: string
  summary: string
  kpi: string
}

export function ExecutiveStoryboard({
  slides,
  className,
}: {
  slides: StoryboardSlide[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const current = slides[Math.max(0, Math.min(index, slides.length - 1))]

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <Presentation className="h-4 w-4 text-saffron-500" />
          <div>
            <h2 className="font-semibold">Executive Storyboard Mode</h2>
            <p className="text-xs text-muted-foreground">Slide-style narrative for reporting and review</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {index + 1}/{Math.max(slides.length, 1)}
        </span>
      </div>
      {current && (
        <article className="rounded-xl border border-border bg-gradient-to-br from-background to-secondary/30 p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Slide KPI</p>
          <p className="text-3xl font-semibold mb-2">{current.kpi}</p>
          <p className="text-lg font-medium">{current.title}</p>
          <p className="text-sm text-muted-foreground mt-2">{current.summary}</p>
        </article>
      )}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((value) => (value - 1 + slides.length) % slides.length)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setIndex((value) => (value + 1) % slides.length)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export interface JourneyStep {
  id: string
  title: string
  detail: string
  progress: number
  href?: string
}

export function JourneyMapUI({
  steps,
  className,
}: {
  steps: JourneyStep[]
  className?: string
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Journey Map UI</h2>
          <p className="text-xs text-muted-foreground">Animated flow from discovery to offer execution</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.id} className="relative rounded-xl border border-border bg-background/70 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                Step {index + 1}
              </span>
              <span className="text-xs text-muted-foreground">{Math.round(step.progress)}%</span>
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>
            <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 transition-all duration-500" style={{ width: `${Math.max(4, Math.min(100, step.progress))}%` }} />
            </div>
            {step.href && (
              <Link href={step.href} className="inline-flex items-center gap-1 mt-2 text-[11px] text-saffron-700 hover:underline">
                Open lane
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {index < steps.length - 1 && (
              <span className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export interface CohortMetric {
  label: string
  value: number
}

export interface CohortItem {
  id: string
  name: string
  metrics: CohortMetric[]
}

export function CohortCompareView({
  cohorts,
  className,
}: {
  cohorts: CohortItem[]
  className?: string
}) {
  const metricNames = Array.from(new Set(cohorts.flatMap((cohort) => cohort.metrics.map((metric) => metric.label))))
  const maxByMetric = new Map<string, number>()
  for (const metric of metricNames) {
    maxByMetric.set(
      metric,
      Math.max(
        1,
        ...cohorts.map((cohort) => cohort.metrics.find((item) => item.label === metric)?.value || 0)
      )
    )
  }

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Cohort Compare View</h2>
        <p className="text-xs text-muted-foreground">Visual comparison across resume/template cohorts and outcomes</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cohorts.map((cohort) => (
          <article key={cohort.id} className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-sm font-medium">{cohort.name}</p>
            <div className="space-y-2 mt-2">
              {cohort.metrics.map((metric) => {
                const max = maxByMetric.get(metric.label) || 1
                return (
                  <div key={`${cohort.id}-${metric.label}`}>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{metric.label}</span>
                      <span>{metric.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(4, Math.round((metric.value / max) * 100))}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export interface PromptResultNode {
  id: string
  prompt: string
  result: string
  score: number
}

export function AIPromptResultFlow({
  nodes,
  className,
}: {
  nodes: PromptResultNode[]
  className?: string
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">AI Prompt-to-Result Flow</h2>
        <p className="text-xs text-muted-foreground">Track which prompts drive stronger conversion outcomes</p>
      </div>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-xl border border-border bg-background/70 p-3">
            <div className="grid gap-2 md:grid-cols-[1fr,24px,1fr,110px] md:items-center">
              <p className="text-xs text-muted-foreground">{node.prompt}</p>
              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="text-xs">{node.result}</p>
              <div className="rounded-full border border-border px-2 py-1 text-[11px] text-right">
                Score {Math.round(node.score)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export interface PlaybackMarker {
  id: string
  label: string
  second: number
  intensity: number
}

export function InterviewPlaybackTimeline({
  durationSec,
  markers,
  className,
}: {
  durationSec: number
  markers: PlaybackMarker[]
  className?: string
}) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const safeDuration = Math.max(1, durationSec)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setPosition((value) => {
        if (value + 1 >= safeDuration) {
          setPlaying(false)
          return safeDuration
        }
        return value + 1
      })
    }, 450)
    return () => window.clearInterval(timer)
  }, [playing, safeDuration])

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">Interview Playback Timeline</h2>
          <p className="text-xs text-muted-foreground">Replay moments with pacing and clarity markers</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="relative h-3 rounded-full bg-secondary">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${Math.min(100, Math.round((position / safeDuration) * 100))}%` }} />
          {markers.map((marker) => (
            <span
              key={marker.id}
              className="absolute -top-1 h-5 w-1 rounded bg-blue-500"
              style={{ left: `${Math.min(100, Math.round((marker.second / safeDuration) * 100))}%`, opacity: 0.4 + marker.intensity * 0.6 }}
              title={`${marker.label} @ ${marker.second}s`}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={safeDuration}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="w-full mt-2 accent-saffron-500"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Position: {position}s / {safeDuration}s</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {markers.map((marker) => (
          <span key={`chip-${marker.id}`} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {marker.label}
          </span>
        ))}
      </div>
    </section>
  )
}

export interface TreemapItem {
  id: string
  label: string
  value: number
  subtitle?: string
}

export function OpportunityTreemap({
  items,
  className,
}: {
  items: TreemapItem[]
  className?: string
}) {
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0))
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Opportunity Treemap</h2>
        <p className="text-xs text-muted-foreground">Upside-weighted view by company and role clusters</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border p-3 bg-gradient-to-br from-background to-secondary/35"
            style={{ minHeight: `${80 + Math.round((item.value / total) * 160)}px` }}
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.subtitle || "Opportunity cluster"}</p>
            <p className="text-xl font-semibold mt-2">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export interface CompanySignal {
  id: string
  name: string
  hiringSignal: number
  responseVelocity: number
  freshness: number
}

export function CompanySignalCards({
  companies,
  className,
}: {
  companies: CompanySignal[]
  className?: string
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Company Signal Cards</h2>
        <p className="text-xs text-muted-foreground">Live indicators for hiring activity and response speed</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <article key={company.id} className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-sm font-medium">{company.name}</p>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hiring signal</span>
                <span>{company.hiringSignal}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${company.hiringSignal}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Response velocity</span>
                <span>{company.responseVelocity}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${company.responseVelocity}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role freshness</span>
                <span>{company.freshness}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-saffron-500" style={{ width: `${company.freshness}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export interface RadarAxis {
  label: string
  value: number
}

function radialPolygonPoints(items: RadarAxis[], radius: number, center: number): string {
  if (items.length === 0) return ""
  return items
    .map((item, index) => {
      const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2
      const ratio = Math.max(0, Math.min(1, item.value / 100))
      const x = center + radius * ratio * Math.cos(angle)
      const y = center + radius * ratio * Math.sin(angle)
      return `${x},${y}`
    })
    .join(" ")
}

export function RiskRadarOverlay({
  axes,
  className,
}: {
  axes: RadarAxis[]
  className?: string
}) {
  const size = 260
  const center = size / 2
  const radius = 95
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Risk Radar Overlay</h2>
        <p className="text-xs text-muted-foreground">Stage-by-stage risk exposure and urgency profile</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[280px,1fr]">
        <div className="rounded-xl border border-border bg-background/65 p-3">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-[250px] w-full">
            {[0.25, 0.5, 0.75, 1].map((level) => (
              <circle key={`risk-level-${level}`} cx={center} cy={center} r={radius * level} fill="none" stroke="currentColor" className="text-border" />
            ))}
            {axes.map((axis, index) => {
              const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2
              const x = center + radius * Math.cos(angle)
              const y = center + radius * Math.sin(angle)
              return <line key={`risk-axis-${axis.label}`} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" className="text-border" />
            })}
            <polygon points={radialPolygonPoints(axes, radius, center)} fill="rgba(239,68,68,0.18)" stroke="rgba(239,68,68,0.9)" strokeWidth={2} />
          </svg>
        </div>
        <div className="space-y-2">
          {axes.map((axis) => (
            <div key={axis.label} className="rounded-lg border border-border bg-background/70 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <span>{axis.label}</span>
                <span className="font-medium">{axis.value}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${Math.max(4, axis.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export interface StageGauge {
  label: string
  score: number
  detail: string
}

export function StageHealthGauges({
  stages,
  className,
}: {
  stages: StageGauge[]
  className?: string
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Stage Health Gauges</h2>
        <p className="text-xs text-muted-foreground">Gauge-style health status across each pipeline stage</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => {
          const score = Math.max(0, Math.min(100, stage.score))
          return (
            <article key={stage.label} className="rounded-xl border border-border bg-background/70 p-3">
              <div className="relative h-24 w-24 mx-auto">
                <div
                  className="h-24 w-24 rounded-full"
                  style={{
                    background: `conic-gradient(rgba(34,197,94,0.95) ${score}%, rgba(148,163,184,0.22) ${score}% 100%)`,
                  }}
                />
                <div className="absolute inset-3 rounded-full bg-background flex items-center justify-center text-lg font-semibold">
                  {Math.round(score)}
                </div>
              </div>
              <p className="text-sm font-medium text-center mt-2">{stage.label}</p>
              <p className="text-[11px] text-muted-foreground text-center mt-1">{stage.detail}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export interface TemplateImpact {
  id: string
  name: string
  category: string
  conversionLift: number
  atsLift: number
}

export function TemplateImpactGallery({
  templates,
  className,
}: {
  templates: TemplateImpact[]
  className?: string
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Template Impact Gallery</h2>
        <p className="text-xs text-muted-foreground">Visual library of templates ranked by conversion impact</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-xl border border-border bg-background/70 p-3">
            <div className="h-16 rounded-lg border border-border bg-gradient-to-br from-saffron-500/15 via-blue-500/15 to-green-500/15" />
            <div className="mt-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{template.name}</p>
                <p className="text-[11px] text-muted-foreground">{template.category}</p>
              </div>
              <span className="rounded-full bg-green-500/10 text-green-700 px-2 py-0.5 text-[11px]">+{template.conversionLift}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">ATS lift: +{template.atsLift}%</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const THEME_STUDIO_STORAGE_KEY = "climb:theme-studio:v1"

export function ThemeStudioLivePreview({ className }: { className?: string }) {
  const [hue, setHue] = useState(94)
  const [sat, setSat] = useState(82)
  const [light, setLight] = useState(49)
  const [radius, setRadius] = useState(20)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(THEME_STUDIO_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Number.isFinite(parsed.hue)) setHue(Number(parsed.hue))
      if (Number.isFinite(parsed.sat)) setSat(Number(parsed.sat))
      if (Number.isFinite(parsed.light)) setLight(Number(parsed.light))
      if (Number.isFinite(parsed.radius)) setRadius(Number(parsed.radius))
    } catch {
      window.localStorage.removeItem(THEME_STUDIO_STORAGE_KEY)
    }
  }, [])

  const previewPrimary = `hsl(${hue} ${sat}% ${light}%)`
  const previewSecondary = `hsl(${Math.max(0, hue - 24)} ${Math.max(28, sat - 24)}% ${Math.max(18, light - 16)}%)`

  const applyToWorkspace = () => {
    if (typeof document === "undefined") return
    document.documentElement.style.setProperty("--saffron", `${hue} ${sat}% ${light}%`)
    document.documentElement.style.setProperty("--gold", `${Math.max(10, hue + 18)} ${Math.max(40, sat)}% ${Math.max(36, light - 3)}%`)
    document.documentElement.style.setProperty("--radius", `${radius}px`)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        THEME_STUDIO_STORAGE_KEY,
        JSON.stringify({ hue, sat, light, radius })
      )
    }
    setApplied(true)
    window.setTimeout(() => setApplied(false), 1200)
  }

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-semibold">Theme Studio + Live Preview</h2>
        <p className="text-xs text-muted-foreground">Tune color/motion style and preview instantly before applying</p>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr,1fr]">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground block">Accent Hue: {hue}</label>
          <input type="range" min={0} max={360} value={hue} onChange={(event) => setHue(Number(event.target.value))} className="w-full accent-saffron-500" />
          <label className="text-xs text-muted-foreground block">Saturation: {sat}%</label>
          <input type="range" min={20} max={100} value={sat} onChange={(event) => setSat(Number(event.target.value))} className="w-full accent-saffron-500" />
          <label className="text-xs text-muted-foreground block">Lightness: {light}%</label>
          <input type="range" min={25} max={75} value={light} onChange={(event) => setLight(Number(event.target.value))} className="w-full accent-saffron-500" />
          <label className="text-xs text-muted-foreground block">Radius: {radius}px</label>
          <input type="range" min={10} max={30} value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="w-full accent-saffron-500" />
          <button type="button" onClick={applyToWorkspace} className="btn-saffron text-sm mt-1">
            {applied ? "Applied" : "Apply Theme"}
          </button>
        </div>
        <div className="rounded-xl border border-border p-3 bg-background/70">
          <div
            className="rounded-lg p-3 text-white"
            style={{
              borderRadius: `${radius}px`,
              background: `linear-gradient(135deg, ${previewPrimary} 0%, ${previewSecondary} 100%)`,
            }}
          >
            <p className="text-sm font-medium">Live Preview Card</p>
            <p className="text-xs text-white/80 mt-1">Color and radius update instantly as you tune sliders.</p>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="h-8 flex-1 rounded-md border border-border" style={{ backgroundColor: previewPrimary }} />
            <span className="h-8 flex-1 rounded-md border border-border" style={{ backgroundColor: previewSecondary }} />
          </div>
        </div>
      </div>
    </section>
  )
}
