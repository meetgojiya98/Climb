import {
  type EnterpriseFeatureDefinition,
  type EnterpriseFeatureWithRollout,
} from "@/lib/enterprise-feature-suite"
import {
  fetchApplicationsCompatible,
  type ApplicationCompatRow,
} from "@/lib/supabase/application-compat"

export type ExecutionFocus = "speed" | "quality" | "conversion" | "risk"
export type RuntimeLane =
  | "ai"
  | "pipeline"
  | "resume"
  | "interview"
  | "networking"
  | "collaboration"
  | "integration"
  | "analytics"
  | "security"
  | "growth"

export interface EnterpriseRuntimeSignals {
  generatedAt: string
  applications: {
    total: number
    open: number
    interviews: number
    offers: number
    rejected: number
    stale: number
    followupDue: number
    avgMatch: number
  }
  roles: {
    total: number
    parsed: number
  }
  resumes: {
    total: number
    avgAts: number
    below80: number
  }
  goals: {
    total: number
    completed: number
  }
  notificationsUnread: number
  anomaliesOpen: number
  momentumScore: number
}

export interface FeatureExecutionAction {
  id: string
  title: string
  detail: string
  moduleHref: string
  priority: "high" | "medium" | "low"
  dueAt: string
  owner: string
  kpi: string
  checklist: string[]
}

export interface FeatureExecutionPackage {
  featureId: string
  title: string
  lane: RuntimeLane
  focus: ExecutionFocus
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
  actions: FeatureExecutionAction[]
  evidence: Array<{
    source: string
    detail: string
    href: string
  }>
  quickPrompts: string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isMissingSchemaError(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes("does not exist") ||
    text.includes("relation") ||
    text.includes("column") ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("not found in the schema cache")
  )
}

function toDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayDiff(from: Date, to: Date) {
  const ms = from.getTime() - to.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

async function safeCount(supabase: any, table: string, userId: string) {
  const result = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId)
  if (result.error) {
    if (isMissingSchemaError(String(result.error.message || ""))) return 0
    throw result.error
  }
  return Number(result.count || 0)
}

async function loadResumeSignals(supabase: any, userId: string) {
  const selectVariants = [
    "id, ats_score, status, updated_at",
    "id, ats_score, updated_at",
    "id, status, updated_at",
    "id, updated_at",
  ]

  let rows: Array<{ id?: string; ats_score?: number | null }> = []
  for (const select of selectVariants) {
    const result = await supabase.from("resumes").select(select).eq("user_id", userId)
    if (!result.error) {
      rows = Array.isArray(result.data) ? result.data : []
      break
    }
    if (!isMissingSchemaError(String(result.error.message || ""))) throw result.error
  }

  const atsValues = rows
    .map((row) => Number(row?.ats_score))
    .filter((value) => Number.isFinite(value))
  const avgAts = atsValues.length
    ? Math.round(atsValues.reduce((sum, value) => sum + value, 0) / atsValues.length)
    : 0
  const below80 = atsValues.filter((value) => value < 80).length

  return {
    total: rows.length,
    avgAts,
    below80,
  }
}

async function loadRoleSignals(supabase: any, userId: string) {
  const variants = ["id, parsed", "id"]
  let rows: Array<{ id?: string; parsed?: unknown }> = []
  for (const select of variants) {
    const result = await supabase.from("roles").select(select).eq("user_id", userId)
    if (!result.error) {
      rows = Array.isArray(result.data) ? result.data : []
      break
    }
    if (!isMissingSchemaError(String(result.error.message || ""))) throw result.error
  }
  const parsed = rows.filter((row) => Boolean(row?.parsed)).length
  return { total: rows.length, parsed }
}

async function loadGoalSignals(supabase: any, userId: string) {
  const result = await supabase.from("career_goals").select("id, completed").eq("user_id", userId)
  if (result.error) {
    if (isMissingSchemaError(String(result.error.message || ""))) return { total: 0, completed: 0 }
    throw result.error
  }
  const rows: Array<{ completed?: boolean | null }> = Array.isArray(result.data) ? result.data : []
  return {
    total: rows.length,
    completed: rows.filter((item: { completed?: boolean | null }) => Boolean(item?.completed)).length,
  }
}

async function loadUnreadNotifications(supabase: any, userId: string) {
  const result = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)
  if (result.error) {
    if (isMissingSchemaError(String(result.error.message || ""))) return 0
    throw result.error
  }
  return Number(result.count || 0)
}

async function loadOpenAnomalies(supabase: any, userId: string) {
  const result = await supabase
    .from("security_anomalies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("resolved", false)
  if (result.error) {
    if (isMissingSchemaError(String(result.error.message || ""))) return 0
    throw result.error
  }
  return Number(result.count || 0)
}

function getApplicationSignals(applications: ApplicationCompatRow[]) {
  const now = new Date()
  const closedStatuses = new Set(["offer", "rejected", "withdrawn"])
  const interviewStatuses = new Set(["interview"])
  const offerStatuses = new Set(["offer"])
  const rejectedStatuses = new Set(["rejected"])

  let open = 0
  let interviews = 0
  let offers = 0
  let rejected = 0
  let stale = 0
  let followupDue = 0

  const scores = applications
    .map((item) => Number(item.match_score))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)

  for (const row of applications) {
    const status = String(row.status || "").toLowerCase()
    if (interviewStatuses.has(status)) interviews += 1
    if (offerStatuses.has(status)) offers += 1
    if (rejectedStatuses.has(status)) rejected += 1
    if (!closedStatuses.has(status)) open += 1

    const anchor = toDate(row.next_action_at) || toDate(row.follow_up_date) || toDate(row.applied_date) || toDate(row.created_at)
    if (!anchor || closedStatuses.has(status)) continue
    const daysOld = dayDiff(now, anchor)
    if (daysOld >= 7) stale += 1
    if (daysOld >= 2) followupDue += 1
  }

  const avgMatch = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 0

  return {
    total: applications.length,
    open,
    interviews,
    offers,
    rejected,
    stale,
    followupDue,
    avgMatch,
  }
}

function getLaneFromFeature(feature: EnterpriseFeatureDefinition): RuntimeLane {
  const text = `${feature.id} ${feature.title} ${feature.summary}`.toLowerCase()
  if (/(sso|scim|gdpr|ccpa|security|encryption|audit|anomaly|session|policy|compliance|trust)/.test(text)) return "security"
  if (/(resume|cover letter|jd|ats|bullet|story|writing|keyword|portfolio site)/.test(text)) return "resume"
  if (/(interview|whiteboard|system design|persona|debrief|negotiation)/.test(text)) return "interview"
  if (/(network|referral|intro|alumni|coffee chat|crm|outreach)/.test(text)) return "networking"
  if (/(workspace|mentor|advisor|approval|stakeholder|comments|review|team role|rollback)/.test(text)) return "collaboration"
  if (/(gmail|outlook|linkedin|greenhouse|lever|workday|notion|slack|teams|webhook|api sync|integration|export)/.test(text)) return "integration"
  if (/(funnel|cohort|benchmark|scenario|drop-off|kpi|roi|experiment|forecast|analytics)/.test(text)) return "analytics"
  if (/(onboarding|walkthrough|command palette|offline|mobile|accessibility|billing|marketplace|plugin|sdk|performance)/.test(text)) return "growth"
  if (/(application|kanban|follow-up|deadline|pipeline|next-best-action|duplicate posting|win-probability)/.test(text)) return "pipeline"
  return "ai"
}

function laneConfig(lane: RuntimeLane) {
  if (lane === "pipeline") return { moduleHref: "/app/applications", label: "pipeline health" }
  if (lane === "resume") return { moduleHref: "/app/resumes", label: "resume quality" }
  if (lane === "interview") return { moduleHref: "/app/interviews", label: "interview readiness" }
  if (lane === "networking") return { moduleHref: "/app/program-office", label: "network growth" }
  if (lane === "collaboration") return { moduleHref: "/app/workspaces", label: "team collaboration" }
  if (lane === "integration") return { moduleHref: "/app/settings/preferences", label: "integration reliability" }
  if (lane === "analytics") return { moduleHref: "/app/forecast", label: "forecast quality" }
  if (lane === "security") return { moduleHref: "/app/security-center", label: "security posture" }
  if (lane === "growth") return { moduleHref: "/app/help", label: "adoption and UX quality" }
  return { moduleHref: "/app/ai-studio", label: "AI execution quality" }
}

function laneSignalScore(lane: RuntimeLane, signals: EnterpriseRuntimeSignals) {
  const open = Math.max(1, signals.applications.open)
  const staleRatio = signals.applications.stale / open

  if (lane === "pipeline") return clamp(Math.round(100 - staleRatio * 100 - signals.applications.followupDue * 2), 25, 98)
  if (lane === "resume") return clamp(Math.round((signals.resumes.avgAts || 52) - signals.resumes.below80 * 2), 20, 98)
  if (lane === "interview") return clamp(Math.round(42 + signals.applications.interviews * 8 + signals.applications.offers * 10), 20, 98)
  if (lane === "networking") return clamp(Math.round(38 + signals.roles.total * 1.5 + signals.applications.open * 0.9), 20, 96)
  if (lane === "collaboration") return clamp(Math.round(45 + signals.goals.completed * 6 - signals.notificationsUnread * 0.8), 18, 96)
  if (lane === "integration") return clamp(Math.round(55 + Math.min(20, signals.applications.total) - signals.notificationsUnread * 0.6), 20, 97)
  if (lane === "analytics") return clamp(Math.round(signals.momentumScore * 0.9 + 8), 25, 98)
  if (lane === "security") return clamp(Math.round(82 - signals.anomaliesOpen * 12), 20, 98)
  if (lane === "growth") return clamp(Math.round(52 + signals.goals.completed * 4 - signals.resumes.below80), 20, 97)
  return clamp(Math.round(signals.momentumScore * 0.8 + 10), 25, 98)
}

function targetForKpi(kpi: string, valueScore: number) {
  const score = clamp(valueScore + 8, 45, 98)
  if (/rate|score|coverage|quality|readiness|compliance|accuracy|health|velocity|lift/i.test(kpi)) {
    return `${score}%`
  }
  if (/time|sla|latency/i.test(kpi)) return `${Math.max(4, 48 - Math.round(score / 2))}h`
  return `${score}`
}

function currentForKpi(kpi: string, signals: EnterpriseRuntimeSignals) {
  if (/ats|resume/i.test(kpi)) return `${signals.resumes.avgAts || 0}%`
  if (/pipeline|follow|application|response|conversion|velocity/i.test(kpi)) return `${clamp(signals.momentumScore - 12, 20, 95)}%`
  if (/interview/i.test(kpi)) return `${clamp(40 + signals.applications.interviews * 8, 20, 95)}%`
  if (/security|risk|compliance|anomaly/i.test(kpi)) return `${clamp(85 - signals.anomaliesOpen * 12, 10, 99)}%`
  return `${signals.momentumScore}%`
}

function buildActionChecklist(featureTitle: string, focus: ExecutionFocus, kpi: string, notes?: string) {
  const items = [
    `Define scope and owner for ${featureTitle}.`,
    `Ship the first production-ready change this week.`,
    `Measure KPI movement for ${kpi}.`,
  ]
  if (focus === "speed") items.push("Reduce cycle time for this feature by removing blockers.")
  if (focus === "quality") items.push("Run QA pass and document quality checks before rollout.")
  if (focus === "conversion") items.push("Track conversion impact after activation.")
  if (focus === "risk") items.push("Review risk controls and fallback path before launch.")
  if (notes?.trim()) items.push(`Apply custom note: ${notes.trim()}`)
  return items
}

export async function loadEnterpriseRuntimeSignals(supabase: any, userId: string): Promise<EnterpriseRuntimeSignals> {
  const [
    applications,
    roles,
    resumes,
    goals,
    notificationsUnread,
    anomaliesOpen,
  ] = await Promise.all([
    fetchApplicationsCompatible(supabase, userId),
    loadRoleSignals(supabase, userId),
    loadResumeSignals(supabase, userId),
    loadGoalSignals(supabase, userId),
    loadUnreadNotifications(supabase, userId),
    loadOpenAnomalies(supabase, userId),
  ])

  const app = getApplicationSignals(applications)
  const momentumScore = clamp(
    Math.round(
      46 +
        app.open * 0.8 +
        app.interviews * 4 +
        app.offers * 8 -
        app.rejected * 1.8 -
        app.stale * 3.6 +
        (resumes.avgAts || 0) * 0.22 +
        roles.total * 0.35
    ),
    0,
    100
  )

  return {
    generatedAt: new Date().toISOString(),
    applications: app,
    roles,
    resumes,
    goals,
    notificationsUnread,
    anomaliesOpen,
    momentumScore,
  }
}

export function buildFeatureExecutionPackage(input: {
  feature: EnterpriseFeatureDefinition
  rollout: EnterpriseFeatureWithRollout
  signals: EnterpriseRuntimeSignals
  focus: ExecutionFocus
  notes?: string
}): FeatureExecutionPackage {
  const { feature, rollout, signals, notes, focus } = input
  const lane = getLaneFromFeature(feature)
  const laneInfo = laneConfig(lane)
  const laneScore = laneSignalScore(lane, signals)
  const valueScore = clamp(
    Math.round(laneScore * 0.58 + signals.momentumScore * 0.28 + rollout.priority * 0.14),
    0,
    100
  )

  const staleRatio = signals.applications.open > 0 ? signals.applications.stale / signals.applications.open : 0
  const riskLevel: "low" | "medium" | "high" =
    valueScore < 48 || staleRatio >= 0.35 || signals.anomaliesOpen >= 2
      ? "high"
      : valueScore < 72 || staleRatio >= 0.2
        ? "medium"
        : "low"

  const generatedAt = new Date().toISOString()
  const baseOwner = rollout.owner || "AI Program Owner"

  const actionTitles = [
    `Baseline ${feature.title}`,
    `Ship first slice for ${feature.title}`,
    `Run KPI check for ${feature.title}`,
    `Scale ${feature.title} to daily workflow`,
    `Close weekly review for ${feature.title}`,
  ]

  const actions: FeatureExecutionAction[] = actionTitles.map((title, index) => {
    const dueAt = new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString()
    const kpi = feature.kpis[index % Math.max(1, feature.kpis.length)] || "Execution quality"
    const priority: "high" | "medium" | "low" = index < 2 ? "high" : index < 4 ? "medium" : "low"
    const detail = [
      `Use ${laneInfo.label} signals to execute this step.`,
      `Current momentum is ${signals.momentumScore} with ${signals.applications.open} open applications.`,
      `Expected KPI impact: ${kpi}.`,
    ].join(" ")

    return {
      id: `${feature.id}-action-${index + 1}`,
      title,
      detail,
      moduleHref: feature.defaultHref || laneInfo.moduleHref,
      priority,
      dueAt,
      owner: baseOwner,
      kpi,
      checklist: buildActionChecklist(feature.title, focus, kpi, notes),
    }
  })

  const kpiTargets = feature.kpis.slice(0, 4).map((kpi) => {
    const current = currentForKpi(kpi, signals)
    const target = targetForKpi(kpi, valueScore)
    const currentNum = Number(String(current).replace(/[^0-9.-]/g, "")) || 0
    const targetNum = Number(String(target).replace(/[^0-9.-]/g, "")) || 0
    const trend: "up" | "down" | "stable" = targetNum > currentNum ? "up" : targetNum < currentNum ? "down" : "stable"
    return {
      name: kpi,
      current,
      target,
      trend,
    }
  })

  const evidence = [
    {
      source: "Applications",
      detail: `${signals.applications.open} open, ${signals.applications.stale} stale, ${signals.applications.interviews} interview-stage.`,
      href: "/app/applications",
    },
    {
      source: "Resumes",
      detail: `${signals.resumes.total} resumes tracked, average ATS ${signals.resumes.avgAts}%.`,
      href: "/app/resumes",
    },
    {
      source: "Roles",
      detail: `${signals.roles.total} roles in queue, ${signals.roles.parsed} parsed for AI matching.`,
      href: "/app/roles",
    },
    {
      source: "Goals",
      detail: `${signals.goals.completed}/${signals.goals.total} goals completed.`,
      href: "/app/goals",
    },
  ]

  return {
    featureId: feature.id,
    title: feature.title,
    lane,
    focus,
    generatedAt,
    summary: `${feature.summary} This run produced a practical execution package with measurable actions, KPI targets, and module-level next steps.`,
    valueScore,
    riskLevel,
    kpiTargets,
    actions,
    evidence,
    quickPrompts: [
      `Turn ${feature.title} actions into a 48-hour checklist.`,
      `What blockers can reduce value score for ${feature.title}?`,
      `Which KPI should I prioritize first for ${feature.title}?`,
      `Convert this plan into mobile-first tasks.`,
    ],
  }
}

export async function createExecutionReminders(input: {
  supabase: any
  userId: string
  feature: EnterpriseFeatureDefinition
  execution: FeatureExecutionPackage
}) {
  const rows = input.execution.actions.slice(0, 3).map((action) => ({
    user_id: input.userId,
    title: `Feature action: ${action.title}`,
    message: action.detail,
    type: action.priority === "high" ? "warning" : "info",
    read: false,
    link: action.moduleHref,
  }))

  if (rows.length === 0) return { created: 0, persistenceEnabled: true }

  const result = await input.supabase.from("notifications").insert(rows)
  if (result.error) {
    if (isMissingSchemaError(String(result.error.message || ""))) {
      return { created: rows.length, persistenceEnabled: false }
    }
    throw result.error
  }
  return { created: rows.length, persistenceEnabled: true }
}

export async function detectEnterpriseRuntimeTables(supabase: any, userId: string) {
  const [applications, roles, resumes, goals] = await Promise.all([
    safeCount(supabase, "applications", userId),
    safeCount(supabase, "roles", userId),
    safeCount(supabase, "resumes", userId),
    safeCount(supabase, "career_goals", userId),
  ])

  return {
    applications,
    roles,
    resumes,
    goals,
  }
}
