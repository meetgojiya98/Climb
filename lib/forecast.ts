type ApplicationLike = {
  status?: string | null
  applied_date?: string | null
  created_at?: string | null
}

export interface ForecastMetrics {
  totalApplications: number
  avgApplicationsPerWeek: number
  responseRate: number
  interviewRate: number
  offerRate: number
}

export interface ForecastProjection {
  weeks: number
  applicationsPerWeek: number
  totalApplications: number
  effectiveResponseRate: number
  effectiveInterviewRate: number
  effectiveOfferRate: number
  expectedResponses: number
  expectedInterviews: number
  expectedOffers: number
}

export interface ForecastSnapshot {
  generatedAt: string
  metrics: ForecastMetrics
  scenarios: ForecastScenario[]
  recommendedWeeklyTarget: number
  recommendations: string[]
}

const RESPONSE_STATUSES = new Set(['screening', 'interview', 'offer'])

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function deriveForecastMetrics(applications: ApplicationLike[]): ForecastMetrics {
  const totalApplications = applications.length
  const responses = applications.filter((app) => RESPONSE_STATUSES.has(String(app.status || ''))).length
  const interviews = applications.filter((app) => String(app.status || '') === 'interview').length
  const offers = applications.filter((app) => String(app.status || '') === 'offer').length

  const now = Date.now()
  const twentyEightDaysMs = 28 * 24 * 60 * 60 * 1000
  const recent28 = applications.filter((app) => {
    const date = toDate(app.applied_date || app.created_at)
    return date ? now - date.getTime() <= twentyEightDaysMs : false
  }).length

  const avgApplicationsPerWeek = recent28 > 0
    ? recent28 / 4
    : Math.max(1, totalApplications / 8)

  const defaultResponse = 22
  const defaultInterview = 9
  const defaultOffer = 2.5

  return {
    totalApplications,
    avgApplicationsPerWeek: clamp(avgApplicationsPerWeek, 1, 500),
    responseRate: totalApplications >= 5 ? pct(responses, totalApplications) : defaultResponse,
    interviewRate: totalApplications >= 5 ? pct(interviews, totalApplications) : defaultInterview,
    offerRate: totalApplications >= 5 ? pct(offers, totalApplications) : defaultOffer,
  }
}

interface ProjectPipelineInput {
  applicationsPerWeek: number
  weeks: number
  responseRate: number
  interviewRate: number
  offerRate: number
  qualityLiftPct?: number
}

export function projectPipeline({
  applicationsPerWeek,
  weeks,
  responseRate,
  interviewRate,
  offerRate,
  qualityLiftPct = 0,
}: ProjectPipelineInput): ForecastProjection {
  const lift = 1 + clamp(qualityLiftPct, -30, 80) / 100
  const totalApplications = Math.round(clamp(applicationsPerWeek, 0, 10000) * clamp(weeks, 1, 52))
  const effectiveResponseRate = clamp(responseRate * lift, 0, 95)
  const effectiveInterviewRate = clamp(interviewRate * lift, 0, 80)
  const effectiveOfferRate = clamp(offerRate * lift, 0, 60)

  return {
    weeks,
    applicationsPerWeek: Math.round(applicationsPerWeek),
    totalApplications,
    effectiveResponseRate,
    effectiveInterviewRate,
    effectiveOfferRate,
    expectedResponses: Math.round((totalApplications * effectiveResponseRate) / 100),
    expectedInterviews: Math.round((totalApplications * effectiveInterviewRate) / 100),
    expectedOffers: Math.round((totalApplications * effectiveOfferRate) / 100),
  }
}

export interface ForecastScenario {
  id: 'conservative' | 'baseline' | 'aggressive'
  label: string
  applicationsPerWeek: number
  qualityLiftPct: number
  projections: ForecastProjection[]
}

export function buildForecastScenarios(metrics: ForecastMetrics): ForecastScenario[] {
  const baseWeekly = Math.max(1, Math.round(metrics.avgApplicationsPerWeek))
  const horizons = [4, 8, 12]

  const configs: Array<{
    id: ForecastScenario['id']
    label: string
    weekly: number
    lift: number
  }> = [
    {
      id: 'conservative',
      label: 'Conservative',
      weekly: Math.max(1, Math.round(baseWeekly * 0.8)),
      lift: 0,
    },
    {
      id: 'baseline',
      label: 'Baseline',
      weekly: baseWeekly,
      lift: 5,
    },
    {
      id: 'aggressive',
      label: 'Aggressive',
      weekly: Math.max(1, Math.round(baseWeekly * 1.5)),
      lift: 15,
    },
  ]

  return configs.map((config) => ({
    id: config.id,
    label: config.label,
    applicationsPerWeek: config.weekly,
    qualityLiftPct: config.lift,
    projections: horizons.map((weeks) =>
      projectPipeline({
        applicationsPerWeek: config.weekly,
        weeks,
        responseRate: metrics.responseRate,
        interviewRate: metrics.interviewRate,
        offerRate: metrics.offerRate,
        qualityLiftPct: config.lift,
      })
    ),
  }))
}

export function buildForecastRecommendations(metrics: ForecastMetrics): string[] {
  const recommendations: string[] = []

  if (metrics.avgApplicationsPerWeek < 5) {
    recommendations.push('Increase weekly application volume to at least 5 for stronger pipeline coverage.')
  }
  if (metrics.responseRate < 20) {
    recommendations.push('Response rate is low. Prioritize role-fit keyword alignment and personalized follow-ups.')
  }
  if (metrics.interviewRate < 8) {
    recommendations.push('Interview conversion is below benchmark. Refresh resume bullets with measurable impact.')
  }
  if (metrics.offerRate < 2) {
    recommendations.push('Offer conversion is limited. Add interview drills and decision-maker follow-up sequences.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Pipeline conversion is stable. Maintain cadence and monitor quality lift weekly.')
  }

  return recommendations.slice(0, 4)
}

function csvEscape(value: string | number): string {
  const raw = String(value)
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function toForecastCsv(snapshot: ForecastSnapshot): string {
  const rows: string[][] = [['section', 'metric', 'value']]
  const push = (section: string, metric: string, value: string | number) => {
    rows.push([section, metric, String(value)])
  }

  push('meta', 'generated_at', snapshot.generatedAt)
  push('meta', 'recommended_weekly_target', snapshot.recommendedWeeklyTarget)

  push('metrics', 'total_applications', snapshot.metrics.totalApplications)
  push('metrics', 'avg_applications_per_week', snapshot.metrics.avgApplicationsPerWeek.toFixed(2))
  push('metrics', 'response_rate', snapshot.metrics.responseRate.toFixed(2))
  push('metrics', 'interview_rate', snapshot.metrics.interviewRate.toFixed(2))
  push('metrics', 'offer_rate', snapshot.metrics.offerRate.toFixed(2))

  snapshot.scenarios.forEach((scenario) => {
    push('scenario', `${scenario.id}.applications_per_week`, scenario.applicationsPerWeek)
    push('scenario', `${scenario.id}.quality_lift_pct`, scenario.qualityLiftPct)
    scenario.projections.forEach((projection) => {
      const prefix = `${scenario.id}.${projection.weeks}w`
      push('projection', `${prefix}.total_applications`, projection.totalApplications)
      push('projection', `${prefix}.expected_responses`, projection.expectedResponses)
      push('projection', `${prefix}.expected_interviews`, projection.expectedInterviews)
      push('projection', `${prefix}.expected_offers`, projection.expectedOffers)
    })
  })

  snapshot.recommendations.forEach((recommendation, index) => {
    push('recommendation', `item_${index + 1}`, recommendation)
  })

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}
