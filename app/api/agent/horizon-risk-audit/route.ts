import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { HORIZON_RISK_AUDIT_PROMPT, SYSTEM_PROMPTS, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const LaneSchema = z.enum([
  'network',
  'branding',
  'role-intel',
  'interview',
  'compensation',
  'automation',
  'governance',
])

const RequestSchema = z.object({
  operatingMode: z.enum(['solo', 'coach', 'team']).optional(),
  horizonWeeks: z.number().min(8).max(20).optional(),
  riskTolerance: z.number().min(0).max(100).optional(),
  lanes: z.array(LaneSchema).min(1).max(5).optional(),
})

const RiskAuditSchema = z.object({
  summary: z.string().min(20).max(2600),
  riskScore: z.number().min(0).max(100),
  riskBand: z.enum(['low', 'moderate', 'high', 'critical']),
  topRisks: z
    .array(
      z.object({
        name: z.string().min(4).max(100),
        severity: z.enum(['low', 'medium', 'high']),
        probability: z.number().min(0).max(100),
        impact: z.string().min(6).max(220),
        trigger: z.string().min(6).max(220),
        owner: z.string().min(2).max(80),
        mitigation: z.string().min(6).max(260),
        moduleHref: z.string().min(5).max(120),
      })
    )
    .min(4)
    .max(6),
  controlChecks: z
    .array(
      z.object({
        name: z.string().min(4).max(100),
        status: z.enum(['green', 'yellow', 'red']),
        detail: z.string().min(6).max(220),
        moduleHref: z.string().min(5).max(120),
      })
    )
    .min(4)
    .max(6),
  recoveryPlan: z
    .array(
      z.object({
        window: z.string().min(4).max(60),
        actions: z.array(z.string().min(6).max(220)).min(3).max(5),
        kpiGuardrails: z.array(z.string().min(5).max(180)).min(2).max(4),
      })
    )
    .length(2),
  quickPrompts: z.array(z.string().min(3).max(160)).min(4).max(8),
  confidence: z.number().min(0).max(1),
})

type Lane = z.infer<typeof LaneSchema>
type RiskAudit = z.infer<typeof RiskAuditSchema>

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function safeHref(href: string): string {
  if (href.startsWith('/app/')) return href
  return '/app/horizons'
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function riskBand(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score < 35) return 'low'
  if (score < 55) return 'moderate'
  if (score < 75) return 'high'
  return 'critical'
}

function buildFallbackAudit(context: Record<string, any>): RiskAudit {
  const req = context.request || {}
  const metrics = context.metrics || {}
  const riskScore = Number(metrics.riskScore || 55)
  const band = riskBand(riskScore)
  const owner = req.operatingMode === 'team' ? 'Program Office' : req.operatingMode === 'coach' ? 'Coach + Candidate' : 'Candidate'

  const staleRiskProb = clamp(30 + Number(metrics.noActionRecords || 0) * 7, 20, 95)
  const qualityRiskProb = clamp(40 + Math.max(0, 78 - Number(metrics.avgATS || 70)), 20, 95)
  const conversionRiskProb = clamp(45 + Math.max(0, 22 - Number(metrics.responseRate || 0)), 20, 95)
  const governanceRiskProb = clamp(35 + Math.max(0, 3 - Number(metrics.activePods || 0)) * 12, 20, 95)

  return {
    summary: [
      `Current expansion risk posture is ${band} with a score of ${riskScore}.`,
      `Primary exposure areas are conversion stability, quality drift, and execution overhead as new lanes are activated.`,
      `The audit recommends a risk-first launch order with explicit KPI guardrails and weekly control checks across Horizons, Control Tower, Forecast, and Program Office.`,
      `Treat this as the operational control plane for horizontal expansion decisions over the next ${req.horizonWeeks || 12} weeks.`,
    ].join(' '),
    riskScore,
    riskBand: band,
    topRisks: [
      {
        name: 'Pipeline control debt growth',
        severity: staleRiskProb >= 65 ? 'high' : staleRiskProb >= 45 ? 'medium' : 'low',
        probability: staleRiskProb,
        impact: 'Overdue and no-action records dilute follow-up quality and reduce conversion reliability.',
        trigger: `No-action records exceed ${Math.max(3, Number(metrics.noActionRecords || 0) + 2)} or overdue items trend upward.`,
        owner,
        mitigation: 'Run midweek risk sweeps and enforce next-action dates on all active applications.',
        moduleHref: '/app/control-tower',
      },
      {
        name: 'Resume-quality drift during scale',
        severity: qualityRiskProb >= 65 ? 'high' : qualityRiskProb >= 45 ? 'medium' : 'low',
        probability: qualityRiskProb,
        impact: 'ATS and role-fit degradation can suppress response rates as throughput rises.',
        trigger: `Average ATS drops below ${Math.max(75, Math.round(Number(metrics.avgATS || 70)))}.`,
        owner: 'Candidate + AI',
        mitigation: 'Run weekly quality sprints and lock proof-signal checks before submission.',
        moduleHref: '/app/resumes',
      },
      {
        name: 'Conversion stagnation',
        severity: conversionRiskProb >= 65 ? 'high' : conversionRiskProb >= 45 ? 'medium' : 'low',
        probability: conversionRiskProb,
        impact: 'Low response/interview movement can make expansion appear active but ineffective.',
        trigger: `Response rate remains below ${Math.max(24, Math.round(Number(metrics.responseRate || 0) + 2))}% for 2 cycles.`,
        owner,
        mitigation: 'Rebalance lanes toward role-intel and interview prep until conversion momentum stabilizes.',
        moduleHref: '/app/forecast',
      },
      {
        name: 'Governance fragmentation',
        severity: governanceRiskProb >= 65 ? 'high' : governanceRiskProb >= 45 ? 'medium' : 'low',
        probability: governanceRiskProb,
        impact: 'Unowned pods and weak reviews cause execution drift and duplicated effort.',
        trigger: 'Weekly governance review is skipped or lacks KPI owner assignments.',
        owner: req.operatingMode === 'team' ? 'Program Office' : owner,
        mitigation: 'Set a fixed Friday review loop with owners, KPIs, and documented decisions.',
        moduleHref: '/app/program-office',
      },
    ],
    controlChecks: [
      {
        name: 'Expansion readiness baseline',
        status: riskScore >= 75 ? 'red' : riskScore >= 55 ? 'yellow' : 'green',
        detail: `Current risk score is ${riskScore}. Target <= 50 for stable scale.`,
        moduleHref: '/app/horizons',
      },
      {
        name: 'Follow-up discipline',
        status: Number(metrics.overdueFollowups || 0) > 0 ? 'yellow' : 'green',
        detail: `${metrics.overdueFollowups || 0} overdue follow-ups detected.`,
        moduleHref: '/app/control-tower',
      },
      {
        name: 'Quality baseline',
        status: Number(metrics.avgATS || 0) < 75 ? 'yellow' : 'green',
        detail: `Average ATS is ${Math.round(Number(metrics.avgATS || 0))}.`,
        moduleHref: '/app/resumes',
      },
      {
        name: 'Conversion trajectory',
        status: Number(metrics.responseRate || 0) < 22 ? 'red' : Number(metrics.responseRate || 0) < 28 ? 'yellow' : 'green',
        detail: `Response ${metrics.responseRate || 0}% • Interview ${metrics.interviewRate || 0}% • Offer ${metrics.offerRate || 0}%`,
        moduleHref: '/app/forecast',
      },
    ],
    recoveryPlan: [
      {
        window: 'Immediate (72 Hours)',
        actions: [
          'Freeze non-critical pod launches until control checks are green/yellow only',
          'Clear overdue and no-action pipeline records with explicit owners',
          'Run one quality uplift pass on top-priority resume variants',
        ],
        kpiGuardrails: [
          `Overdue follow-ups <= ${Math.max(0, Number(metrics.overdueFollowups || 0) - 2)}`,
          `ATS baseline >= ${Math.max(75, Math.round(Number(metrics.avgATS || 70)))}`,
        ],
      },
      {
        window: '2-Week Stabilization',
        actions: [
          'Execute lane rollout in phases: role-intel -> quality -> conversion -> governance',
          'Hold weekly KPI checkpoint and decision log in program review',
          'Adjust weekly application target only after conversion metrics improve',
        ],
        kpiGuardrails: [
          `Response rate >= ${Math.max(24, Math.round(Number(metrics.responseRate || 0) + 2))}%`,
          `Projected offers (8w) >= ${Math.max(1, Math.round(Number(metrics.projectedOffers8w || 0)))}`,
          'Weekly governance review completion = 100%',
        ],
      },
    ],
    quickPrompts: [
      'Which risk should I mitigate first this week?',
      'Create a 3-day risk burn-down plan for my expansion rollout.',
      'How do I protect conversion while launching new pods?',
      'Turn this risk audit into a mobile daily checklist.',
      'Generate a weekly governance agenda from this audit.',
      'What should I postpone until risk score drops below 50?',
    ],
    confidence: 0.63,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const usage = await consumeAIUsageQuota(supabase, user.id, 'horizon-risk-audit')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for horizon risk audit',
          code: 'AI_RATE_LIMIT',
          plan: usage.plan,
          retryAfterSec: usage.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(usage),
            'Retry-After': String(usage.retryAfterSec),
          },
        }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      operatingMode = 'solo',
      horizonWeeks = 12,
      riskTolerance = 55,
      lanes = ['role-intel', 'branding', 'automation', 'governance'] as Lane[],
    } = RequestSchema.parse(body)

    const [applications, resumesResult, rolesResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('roles').select('id, parsed').eq('user_id', user.id),
    ])

    const resumes = resumesResult.data || []
    const roles = rolesResult.data || []
    const activeStatuses = new Set(['applied', 'screening', 'interview'])
    const activeApps = applications.filter((app: any) => activeStatuses.has(String(app.status || '')))
    const overdueFollowups = activeApps.filter((app: any) => {
      const date = new Date(app.next_action_at || app.follow_up_date || '')
      return Number.isFinite(date.getTime()) && date < new Date()
    }).length
    const noActionRecords = activeApps.filter((app: any) => !app.next_action_at && !app.follow_up_date).length

    const atsValues = resumes
      .map((resume: any) => Number(resume.ats_score))
      .filter((value: number) => Number.isFinite(value))
    const avgATS = atsValues.length > 0
      ? atsValues.reduce((sum: number, value: number) => sum + value, 0) / atsValues.length
      : 70

    const parsedRoles = roles.filter((role: any) => role.parsed && typeof role.parsed === 'object').length
    const parsingCoverage = roles.length > 0 ? (parsedRoles / roles.length) * 100 : 0

    const responseCount = applications.filter((app: any) =>
      ['screening', 'interview', 'offer'].includes(String(app.status || ''))
    ).length
    const interviewCount = applications.filter((app: any) => String(app.status || '') === 'interview').length
    const offerCount = applications.filter((app: any) => String(app.status || '') === 'offer').length

    const responseRate = pct(responseCount, applications.length)
    const interviewRate = pct(interviewCount, applications.length)
    const offerRate = pct(offerCount, applications.length)

    const activePods = [
      resumes.length > 0,
      roles.length > 0,
      applications.length > 0,
      responseCount > 0,
      interviewCount > 0,
    ].filter(Boolean).length

    const tolerancePenalty = clamp((50 - riskTolerance) * 0.5, -20, 25)
    const riskScore = clamp(
      100 -
        (avgATS * 0.35 +
          responseRate * 0.2 +
          parsingCoverage * 0.15 +
          Math.max(0, 100 - overdueFollowups * 10 - noActionRecords * 8) * 0.2 +
          clamp(activePods * 15, 0, 100) * 0.1) +
        tolerancePenalty,
      0,
      100
    )

    const context = {
      request: {
        operatingMode,
        horizonWeeks,
        riskTolerance,
        lanes,
      },
      metrics: {
        applications: applications.length,
        activeApplications: activeApps.length,
        overdueFollowups,
        noActionRecords,
        avgATS: Number(avgATS.toFixed(1)),
        parsingCoverage: Number(parsingCoverage.toFixed(1)),
        responseRate: Number(responseRate.toFixed(1)),
        interviewRate: Number(interviewRate.toFixed(1)),
        offerRate: Number(offerRate.toFixed(1)),
        projectedOffers8w: Math.max(0, Math.round((offerRate / 100) * Math.max(8, applications.length * 0.5))),
        activePods,
        riskScore: Number(riskScore.toFixed(1)),
      },
      generatedAt: new Date().toISOString(),
    }

    let audit = buildFallbackAudit(context)

    try {
      const prompt = fillTemplate(HORIZON_RISK_AUDIT_PROMPT, {
        HORIZON_RISK_CONTEXT: JSON.stringify(context, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          { role: 'system', content: `${SYSTEM_PROMPTS.SAFETY}\nKeep risk guidance measurable and operational.` },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1700 }
      )

      const parsed = parseLLMJson(response.content, RiskAuditSchema, 'object')
      audit = {
        ...parsed,
        topRisks: parsed.topRisks.map((item) => ({ ...item, moduleHref: safeHref(item.moduleHref) })),
        controlChecks: parsed.controlChecks.map((item) => ({ ...item, moduleHref: safeHref(item.moduleHref) })),
      }
    } catch (error) {
      console.error('Horizon risk audit fallback triggered:', error)
    }

    return NextResponse.json(
      { success: true, audit },
      { headers: buildRateLimitHeaders(usage) }
    )
  } catch (error: any) {
    console.error('Horizon risk audit route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid horizon risk audit request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate horizon risk audit' },
      { status: 500 }
    )
  }
}
