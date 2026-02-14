import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import { callLLMWithRetry } from '@/lib/llm'
import { parseLLMJson } from '@/lib/llm-json'
import { INTERVIEW_CURRICULUM_PROMPT, SYSTEM_PROMPTS, fillTemplate } from '@/lib/prompts'
import { buildRateLimitHeaders, consumeAIUsageQuota } from '@/lib/ai-usage'

const FocusAreaSchema = z.enum([
  'storytelling',
  'metrics',
  'technical-depth',
  'presence',
  'system-design',
  'behavioral',
])

const RequestSchema = z.object({
  targetRole: z.string().min(2).max(120).optional(),
  weeklyHours: z.number().min(2).max(20).optional(),
  focus: z.array(FocusAreaSchema).min(1).max(4).optional(),
})

const CurriculumSchema = z.object({
  overview: z.string().min(24).max(2400),
  baseline: z.object({
    sessions30d: z.number().min(0).max(200),
    avgScore: z.number().min(0).max(100),
    interviewRate: z.number().min(0).max(100),
    strengths: z.array(z.string().min(6).max(220)).min(2).max(4),
    risks: z.array(z.string().min(6).max(220)).min(2).max(4),
  }),
  weeklyPlan: z
    .array(
      z.object({
        week: z.string().min(4).max(60),
        objective: z.string().min(8).max(220),
        drills: z.array(z.string().min(6).max(220)).min(3).max(5),
        checkpoint: z.string().min(6).max(220),
        deviceTips: z.object({
          mobile: z.string().min(6).max(220),
          ipad: z.string().min(6).max(220),
          desktop: z.string().min(6).max(220),
        }),
      })
    )
    .length(3),
  dailyCadence: z
    .array(
      z.object({
        day: z.string().min(2).max(20),
        focus: z.string().min(4).max(120),
        durationMin: z.number().min(10).max(180),
        action: z.string().min(6).max(220),
      })
    )
    .min(5)
    .max(7),
  questionThemes: z.array(z.string().min(3).max(120)).min(4).max(8),
  aiScripts: z
    .array(
      z.object({
        title: z.string().min(4).max(100),
        prompt: z.string().min(8).max(240),
        useWhen: z.string().min(6).max(160),
      })
    )
    .min(3)
    .max(5),
  confidence: z.number().min(0).max(1),
})

type FocusArea = z.infer<typeof FocusAreaSchema>
type InterviewCurriculum = z.infer<typeof CurriculumSchema>

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function focusEnabled(focus: FocusArea[], area: FocusArea): boolean {
  return focus.includes(area)
}

function buildFallbackCurriculum(context: Record<string, any>): InterviewCurriculum {
  const weeklyHours = Number(context.request?.weeklyHours || 6)
  const targetRole = String(context.request?.targetRole || 'your target role')
  const focus = (context.request?.focus || ['storytelling', 'metrics', 'behavioral']) as FocusArea[]
  const metrics = context.metrics || {}

  const baseDuration = clamp(Math.round((weeklyHours * 60) / 5), 20, 80)
  const interviewRate = Number(metrics.interviewRate || 0)
  const avgScore = Number(metrics.avgScore || 0)
  const sessions30d = Number(metrics.sessions30d || 0)

  const strengths = [
    sessions30d >= 4
      ? `Practice consistency is strong with ${sessions30d} sessions in the last 30 days.`
      : `You have some recent practice signals to build on (${sessions30d} sessions in 30 days).`,
    avgScore >= 70
      ? `Average interview score baseline (${Math.round(avgScore)}) indicates good answer quality.`
      : 'You have usable baseline responses that can be strengthened with tighter structure and metrics.',
    interviewRate >= 12
      ? `Interview conversion baseline (${Math.round(interviewRate)}%) provides momentum for improvement.`
      : 'Interview conversion baseline leaves room for measurable uplift through focused practice.',
  ]

  const risks = [
    avgScore < 70
      ? `Average score (${Math.round(avgScore)}) is below enterprise target and needs structured drills.`
      : 'Answer consistency can drift without a fixed practice cadence.',
    sessions30d < 4
      ? 'Low interview rehearsal volume can reduce confidence under pressure.'
      : 'Without checkpoint reviews, high volume may not translate into quality gains.',
    !focusEnabled(focus, 'metrics')
      ? 'Impact quantification is often underdeveloped without explicit metric drills.'
      : 'Metrics are improving, but stronger storytelling can still increase clarity and memorability.',
  ]

  return {
    overview: [
      `This 3-week interview curriculum is designed for ${targetRole} with a ${weeklyHours}h/week training budget.`,
      'The plan moves in three stages: stabilize structure, sharpen evidence and delivery, then pressure-test with realistic simulations.',
      `Current baseline is ${Math.round(interviewRate)}% interview conversion and ${Math.round(avgScore)} average interview score. The goal is to improve both quality and confidence while keeping practice sustainable across mobile, iPad, and desktop.`,
    ].join(' '),
    baseline: {
      sessions30d,
      avgScore: clamp(Math.round(avgScore), 0, 100),
      interviewRate: clamp(Math.round(interviewRate), 0, 100),
      strengths: strengths.slice(0, 4),
      risks: risks.slice(0, 4),
    },
    weeklyPlan: [
      {
        week: 'Week 1: Foundation',
        objective: 'Build reliable STAR structure and eliminate rambling responses.',
        drills: [
          'Record 5 behavioral answers using strict STAR sequence in under 2 minutes each',
          'Rewrite weakest 3 answers with clearer action and ownership language',
          'Practice one daily prompt with a metrics-focused closing sentence',
        ],
        checkpoint: 'By week end, deliver 80% of answers with clear STAR flow and concise endings.',
        deviceTips: {
          mobile: 'Run 15-minute voice answer drills during short breaks.',
          ipad: 'Review rewritten answers side-by-side with prompts.',
          desktop: 'Do full timed mock sessions and capture notes.',
        },
      },
      {
        week: 'Week 2: Conversion Lift',
        objective: 'Improve answer quality with quantifiable impact and sharper storytelling.',
        drills: [
          'Build a metrics bank: 8 quantifiable outcomes mapped to your core stories',
          'Run category-focused rounds: behavioral + situational with self-scoring',
          'Practice one technical or role-depth explanation daily with concise framing',
        ],
        checkpoint: 'Raise average practice score by 8-12 points from baseline.',
        deviceTips: {
          mobile: 'Use quick rehearsal prompts before key meetings.',
          ipad: 'Annotate weak transitions and refine storytelling flow.',
          desktop: 'Run 45-minute mixed-category mock interviews.',
        },
      },
      {
        week: 'Week 3: Pressure Test',
        objective: 'Simulate realistic interview pressure and finalize high-conversion answer set.',
        drills: [
          'Complete 3 full mock interviews with no notes',
          'Run a confidence drill: answer difficult questions in first 20 seconds with clear framing',
          'Finalize a top-12 answer library for recurring interview themes',
        ],
        checkpoint: 'Enter live interviews with stable answer quality and repeatable confidence.',
        deviceTips: {
          mobile: 'Use flash-practice in short pre-interview windows.',
          ipad: 'Review final answer library before interviews.',
          desktop: 'Run end-to-end mock loops with timing and debrief.',
        },
      },
    ],
    dailyCadence: [
      {
        day: 'Monday',
        focus: 'Structure',
        durationMin: baseDuration,
        action: 'Practice STAR framing on 2 behavioral prompts and debrief.',
      },
      {
        day: 'Tuesday',
        focus: 'Evidence',
        durationMin: baseDuration,
        action: 'Add measurable outcomes and tighten action statements.',
      },
      {
        day: 'Wednesday',
        focus: 'Role Depth',
        durationMin: baseDuration,
        action: 'Run technical or situational answers with clear problem framing.',
      },
      {
        day: 'Thursday',
        focus: 'Delivery',
        durationMin: baseDuration,
        action: 'Simulate pressure and improve clarity, pacing, and confidence.',
      },
      {
        day: 'Friday',
        focus: 'Review',
        durationMin: baseDuration,
        action: 'Score weekly answers, track trends, and set next-week focus.',
      },
    ],
    questionThemes: [
      'Conflict resolution and stakeholder alignment',
      'Ownership under ambiguity',
      'Tradeoff and decision-making',
      'Measurable impact and outcomes',
      'Technical depth and simplification',
      'Learning velocity and adaptability',
    ],
    aiScripts: [
      {
        title: 'Rewrite Weak Answer',
        prompt: 'Rewrite this interview answer using STAR with one measurable result and clearer ownership.',
        useWhen: 'When an answer feels vague or unfocused.',
      },
      {
        title: 'Pressure Simulation',
        prompt: 'Ask me 5 high-pressure follow-up questions based on this answer and score each response.',
        useWhen: 'When preparing for final rounds or difficult panels.',
      },
      {
        title: 'Role-Specific Drill',
        prompt: `Create a ${targetRole} interview drill set for today with behavioral, situational, and technical prompts.`,
        useWhen: 'When you need a daily structured practice set.',
      },
      {
        title: 'Metrics Upgrade',
        prompt: 'Help me add stronger quantified impact to these interview stories without fabricating details.',
        useWhen: 'When stories lack concrete outcome evidence.',
      },
    ],
    confidence: 0.65,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await consumeAIUsageQuota(supabase, user.id, 'interview-curriculum')
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'AI rate limit exceeded for interview curriculum',
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
      targetRole = 'your target role',
      weeklyHours = 6,
      focus = ['storytelling', 'metrics', 'behavioral'] as FocusArea[],
    } = RequestSchema.parse(body)

    const [applications, sessionsResult] = await Promise.all([
      fetchApplicationsCompatible(supabase, user.id),
      supabase
        .from('interview_sessions')
        .select('score, questions_answered, created_at, category')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sessions = sessionsResult.data || []
    const sessions30d = sessions.filter((session: any) => {
      const date = safeDate(session.created_at)
      return date ? date >= thirtyDaysAgo : false
    })

    const scores = sessions30d
      .map((session: any) => Number(session.score))
      .filter((value: number) => Number.isFinite(value))
    const avgScore = scores.length > 0 ? scores.reduce((sum, item) => sum + item, 0) / scores.length : 58

    const interviews = applications.filter((app: any) => String(app.status || '') === 'interview').length
    const interviewRate = pct(interviews, applications.length)

    const contextSnapshot = {
      request: {
        targetRole,
        weeklyHours,
        focus,
      },
      metrics: {
        totalApplications: applications.length,
        interviewsInPipeline: interviews,
        interviewRate: Number(interviewRate.toFixed(1)),
        sessions30d: sessions30d.length,
        avgScore: Number(avgScore.toFixed(1)),
      },
      recentSessions: sessions.slice(0, 10),
      generatedAt: new Date().toISOString(),
    }

    let curriculum = buildFallbackCurriculum(contextSnapshot)

    try {
      const prompt = fillTemplate(INTERVIEW_CURRICULUM_PROMPT, {
        INTERVIEW_CURRICULUM_CONTEXT: JSON.stringify(contextSnapshot, null, 2),
      })

      const response = await callLLMWithRetry(
        [
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ],
        1,
        { temperature: 0.35, maxTokens: 1900 }
      )

      curriculum = parseLLMJson(response.content, CurriculumSchema, 'object')
    } catch (error) {
      console.error('Interview curriculum fallback triggered:', error)
    }

    return NextResponse.json(
      {
        success: true,
        curriculum,
        usage: {
          plan: usage.plan,
          remaining: usage.remaining,
          limit: usage.limit,
          resetAt: usage.resetAt,
        },
      },
      {
        headers: buildRateLimitHeaders(usage),
      }
    )
  } catch (error: any) {
    console.error('Interview curriculum route error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid interview curriculum request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate interview curriculum' },
      { status: 500 }
    )
  }
}
