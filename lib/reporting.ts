type AnyRecord = Record<string, any>

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekKey(date: Date): string {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export interface ExecutiveReport {
  generatedAt: string
  overview: {
    totalApplications: number
    activePipeline: number
    responseRate: number
    interviewRate: number
    offerRate: number
  }
  quality: {
    averageMatchScore: number
    averageAtsScore: number
    rolesTracked: number
  }
  risk: {
    overdueFollowUps: number
    staleApplications: number
    activeWithoutNextAction: number
  }
  goals: {
    total: number
    completed: number
    completionRate: number
  }
  momentum: {
    applications7d: number
    applications30d: number
    interviewSessions30d: number
  }
  pipelineByStatus: Array<{
    status: string
    count: number
  }>
  topCompanies: Array<{
    company: string
    count: number
  }>
  weeklyTrend: Array<{
    week: string
    applications: number
    interviews: number
    offers: number
  }>
  recommendations: string[]
}

interface BuildExecutiveReportInput {
  applications: AnyRecord[]
  resumes: AnyRecord[]
  roles: AnyRecord[]
  goals: AnyRecord[]
  sessions: AnyRecord[]
}

const ACTIVE_STATUSES = new Set(['applied', 'screening', 'interview'])
const RESPONSE_STATUSES = new Set(['screening', 'interview', 'offer'])

export function buildExecutiveReport({
  applications,
  resumes,
  roles,
  goals,
  sessions,
}: BuildExecutiveReportInput): ExecutiveReport {
  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const totalApplications = applications.length
  const activePipeline = applications.filter((a) => ACTIVE_STATUSES.has(String(a.status || ''))).length
  const responses = applications.filter((a) => RESPONSE_STATUSES.has(String(a.status || ''))).length
  const interviews = applications.filter((a) => String(a.status || '') === 'interview').length
  const offers = applications.filter((a) => String(a.status || '') === 'offer').length

  const overdueFollowUps = applications.filter((a) => {
    if (!ACTIVE_STATUSES.has(String(a.status || ''))) return false
    const nextActionDate = toDate(a.next_action_at || a.follow_up_date)
    return nextActionDate ? startOfDay(nextActionDate) <= today : false
  }).length

  const staleApplications = applications.filter((a) => {
    if (!ACTIVE_STATUSES.has(String(a.status || ''))) return false
    if (a.next_action_at || a.follow_up_date) return false
    const sourceDate = toDate(a.applied_date || a.created_at)
    if (!sourceDate) return false
    const diffDays = Math.floor((today.getTime() - startOfDay(sourceDate).getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 14
  }).length

  const activeWithoutNextAction = applications.filter(
    (a) => ACTIVE_STATUSES.has(String(a.status || '')) && !a.next_action_at && !a.follow_up_date
  ).length

  const matchScores = applications
    .map((a) => Number(a.match_score))
    .filter((score) => Number.isFinite(score))
  const atsScores = resumes
    .map((r) => Number(r.ats_score))
    .filter((score) => Number.isFinite(score))

  const completedGoals = goals.filter((goal) => Boolean(goal.completed)).length

  const applications7d = applications.filter((a) => {
    const date = toDate(a.applied_date || a.created_at)
    return date ? date >= sevenDaysAgo : false
  }).length

  const applications30d = applications.filter((a) => {
    const date = toDate(a.applied_date || a.created_at)
    return date ? date >= thirtyDaysAgo : false
  }).length

  const interviewSessions30d = sessions.filter((session) => {
    const date = toDate(session.created_at)
    return date ? date >= thirtyDaysAgo : false
  }).length

  const statusCounts = new Map<string, number>()
  applications.forEach((app) => {
    const key = String(app.status || 'unknown')
    statusCounts.set(key, (statusCounts.get(key) || 0) + 1)
  })

  const pipelineByStatus = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const companyCounts = new Map<string, { company: string; count: number }>()
  applications.forEach((app) => {
    const raw = String(app.company || '').trim()
    if (!raw) return
    const normalized = raw.toLowerCase()
    const existing = companyCounts.get(normalized)
    if (existing) {
      existing.count += 1
      return
    }
    companyCounts.set(normalized, { company: raw, count: 1 })
  })
  const topCompanies = Array.from(companyCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const trendMap = new Map<string, { week: string; applications: number; interviews: number; offers: number }>()
  for (let i = 7; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = weekKey(d)
    trendMap.set(key, {
      week: key,
      applications: 0,
      interviews: 0,
      offers: 0,
    })
  }

  applications.forEach((app) => {
    const date = toDate(app.applied_date || app.created_at)
    if (!date) return
    const key = weekKey(date)
    const bucket = trendMap.get(key)
    if (!bucket) return
    bucket.applications += 1
    if (String(app.status || '') === 'interview') bucket.interviews += 1
    if (String(app.status || '') === 'offer') bucket.offers += 1
  })

  const recommendations: string[] = []
  if (overdueFollowUps > 0) {
    recommendations.push(`Resolve ${overdueFollowUps} overdue follow-up task${overdueFollowUps > 1 ? 's' : ''} this week.`)
  }
  if (staleApplications > 0) {
    recommendations.push(`Refresh ${staleApplications} stale application${staleApplications > 1 ? 's' : ''} with outreach or status updates.`)
  }
  if (pct(responses, totalApplications) < 20 && totalApplications >= 10) {
    recommendations.push('Response rate is below target. Increase resume-role alignment and follow-up cadence.')
  }
  if (clampScore(matchScores.length ? matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length : 0) < 70) {
    recommendations.push('Average match score is under 70. Prioritize keyword coverage in top role targets.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Pipeline health is stable. Continue consistent weekly application volume.')
  }

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalApplications,
      activePipeline,
      responseRate: pct(responses, totalApplications),
      interviewRate: pct(interviews, totalApplications),
      offerRate: pct(offers, totalApplications),
    },
    quality: {
      averageMatchScore: clampScore(
        matchScores.length ? matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length : 0
      ),
      averageAtsScore: clampScore(
        atsScores.length ? atsScores.reduce((sum, score) => sum + score, 0) / atsScores.length : 0
      ),
      rolesTracked: roles.length,
    },
    risk: {
      overdueFollowUps,
      staleApplications,
      activeWithoutNextAction,
    },
    goals: {
      total: goals.length,
      completed: completedGoals,
      completionRate: pct(completedGoals, goals.length),
    },
    momentum: {
      applications7d,
      applications30d,
      interviewSessions30d,
    },
    pipelineByStatus,
    topCompanies,
    weeklyTrend: Array.from(trendMap.values()),
    recommendations,
  }
}

function csvEscape(value: string | number): string {
  const raw = String(value)
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function toExecutiveCsv(report: ExecutiveReport): string {
  const rows: string[][] = [['section', 'metric', 'value']]
  const push = (section: string, metric: string, value: string | number) => {
    rows.push([section, metric, String(value)])
  }

  push('meta', 'generated_at', report.generatedAt)

  Object.entries(report.overview).forEach(([metric, value]) => push('overview', metric, value))
  Object.entries(report.quality).forEach(([metric, value]) => push('quality', metric, value))
  Object.entries(report.risk).forEach(([metric, value]) => push('risk', metric, value))
  Object.entries(report.goals).forEach(([metric, value]) => push('goals', metric, value))
  Object.entries(report.momentum).forEach(([metric, value]) => push('momentum', metric, value))

  report.pipelineByStatus.forEach((item) => push('pipeline_by_status', item.status, item.count))
  report.topCompanies.forEach((item) => push('top_companies', item.company, item.count))
  report.weeklyTrend.forEach((item) => {
    push('weekly_trend', `${item.week}.applications`, item.applications)
    push('weekly_trend', `${item.week}.interviews`, item.interviews)
    push('weekly_trend', `${item.week}.offers`, item.offers)
  })
  report.recommendations.forEach((text, index) => push('recommendations', `item_${index + 1}`, text))

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}
