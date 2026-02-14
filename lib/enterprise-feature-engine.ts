import {
  ENTERPRISE_FEATURE_CATALOG,
  ENTERPRISE_FEATURE_CATEGORY_ORDER,
  type EnterpriseFeatureWithRollout,
  type EnterpriseFeatureDefinition,
} from "@/lib/enterprise-feature-suite"

export interface FeatureSprintPlan {
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

export interface FeatureRoadmapPlan {
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

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function splitIntoChunks<T>(items: T[], chunkCount: number): T[][] {
  if (items.length === 0) return Array.from({ length: chunkCount }, () => [])
  const chunks: T[][] = Array.from({ length: chunkCount }, () => [])
  items.forEach((item, index) => {
    const chunkIndex = index % chunkCount
    chunks[chunkIndex].push(item)
  })
  return chunks
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rankFeatures(features: EnterpriseFeatureWithRollout[]): EnterpriseFeatureWithRollout[] {
  const categoryRank = new Map(ENTERPRISE_FEATURE_CATEGORY_ORDER.map((category, index) => [category, index]))
  return [...features].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const aCategory = categoryRank.get(a.category) ?? 999
    const bCategory = categoryRank.get(b.category) ?? 999
    if (aCategory !== bCategory) return aCategory - bCategory
    return a.title.localeCompare(b.title)
  })
}

function statusLabel(status: EnterpriseFeatureWithRollout["status"]): string {
  if (status === "live") return "active"
  if (status === "in_progress") return "in-flight"
  if (status === "planned") return "planned"
  return "backlog"
}

export function buildFeatureSprintPlan(feature: EnterpriseFeatureDefinition, notes?: string): FeatureSprintPlan {
  const baseActions = feature.sprintTemplate.slice(0, 4)
  const sprintDays = [0, 1, 2, 3, 4].map((offset) => {
    const template = baseActions[offset % baseActions.length]
    const objective = offset === 0
      ? `Initialize ${feature.title} operating baseline.`
      : offset === 4
        ? `Close sprint with measurable ${feature.category.toLowerCase()} outcomes.`
        : `Advance ${feature.title} execution lane.`

    const actions = [
      template,
      `Capture decisions and blockers for ${feature.title.toLowerCase()}.`,
      `Record KPI movement for: ${feature.kpis[0]}.`,
    ]

    if (notes?.trim()) {
      actions.push(`Apply custom directive: ${notes.trim()}`)
    }

    return {
      day: WEEKDAY_LABELS[offset],
      objective,
      actions,
      successMetric: feature.kpis[offset % feature.kpis.length] || feature.kpis[0] || "Execution quality",
    }
  })

  return {
    featureId: feature.id,
    title: `${feature.title} - 7 Day Sprint`,
    summary: `${feature.summary} This sprint is optimized for immediate execution with KPI checkpoints and daily action loops.`,
    sprintDays,
    quickPrompts: [
      `How do I accelerate ${feature.title.toLowerCase()} impact this week?`,
      `Create a risk mitigation ladder for ${feature.title.toLowerCase()}.`,
      `What KPIs should I review daily for ${feature.title.toLowerCase()}?`,
      `Turn this sprint into mobile-first tasks.`,
    ],
    confidence: 0.74,
  }
}

export function buildFeatureRoadmapPlan(input: {
  objective?: string
  horizonWeeks?: number
  selectedFeatures: EnterpriseFeatureWithRollout[]
}): FeatureRoadmapPlan {
  const horizonWeeks = clamp(Math.round(Number(input.horizonWeeks) || 12), 6, 26)
  const objective =
    input.objective?.trim() ||
    "Deploy all enterprise capabilities with measurable conversion, governance, and AI execution gains."

  const ranked = rankFeatures(input.selectedFeatures)
  const selected = ranked.length > 0 ? ranked : rankFeatures(
    ENTERPRISE_FEATURE_CATALOG.map((feature) => ({
      ...feature,
      featureId: feature.id,
      status: "planned",
      priority: 70,
      owner: "AI Program Owner",
      notes: "",
      lastRunAt: null,
      updatedAt: null,
    }))
  )

  const chunks = splitIntoChunks(selected, 3)
  const windowDurations = [
    Math.max(2, Math.round(horizonWeeks * 0.3)),
    Math.max(2, Math.round(horizonWeeks * 0.35)),
    Math.max(2, Math.max(0, horizonWeeks - Math.round(horizonWeeks * 0.3) - Math.round(horizonWeeks * 0.35))),
  ]

  const windows = chunks.map((group, index) => {
    const startWeek = windowDurations.slice(0, index).reduce((sum, value) => sum + value, 0) + 1
    const endWeek = startWeek + windowDurations[index] - 1
    const focus =
      index === 0
        ? "Stabilize core AI and conversion engines"
        : index === 1
          ? "Scale automation and collaboration governance"
          : "Operationalize security, integrations, and continuous optimization"

    const outcomes = [
      `Launch ${group.length} ${group.length === 1 ? "feature" : "features"} with explicit owners and SLAs.`,
      `Maintain >= ${Math.max(80, 70 + index * 5)} average priority execution on active workstreams.`,
      `Publish weekly decision brief with KPI changes and risk posture updates.`,
    ]

    return {
      name: index === 0 ? "Wave 1" : index === 1 ? "Wave 2" : "Wave 3",
      weeks: `Weeks ${startWeek}-${endWeek}`,
      focus,
      outcomes,
      featureIds: group.map((feature) => feature.id),
    }
  })

  const statusMix = {
    active: selected.filter((item) => item.status === "live").length,
    inFlight: selected.filter((item) => item.status === "in_progress").length,
    planned: selected.filter((item) => item.status === "planned").length,
    backlog: selected.filter((item) => item.status === "backlog").length,
  }

  const summary = [
    `Roadmap objective: ${objective}`,
    `${selected.length} features are in scope across ${horizonWeeks} weeks (${statusMix.active} active, ${statusMix.inFlight} in-flight, ${statusMix.planned} planned, ${statusMix.backlog} backlog).`,
    `Execution model: weekly KPI review, risk-first sequencing, and continuous AI optimization across all modules.`,
  ].join(" ")

  return {
    objective,
    horizonWeeks,
    summary,
    windows,
    quickPrompts: [
      "Generate this roadmap as a 30/60/90 execution matrix.",
      "Which wave should receive additional staffing this week?",
      "Where is the highest risk of rollout slippage?",
      "Turn Wave 1 into daily action items with owners.",
    ],
    confidence: 0.76,
  }
}

export function toFeatureMap(features: EnterpriseFeatureWithRollout[]) {
  return Object.fromEntries(
    features.map((feature) => [
      feature.id,
      {
        id: feature.id,
        title: feature.title,
        status: feature.status,
        statusLabel: statusLabel(feature.status),
        priority: feature.priority,
        owner: feature.owner,
        href: feature.defaultHref,
        category: feature.category,
      },
    ])
  )
}
