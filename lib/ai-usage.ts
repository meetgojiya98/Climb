type PlanTier = 'free' | 'pro'
type FeatureKey =
  | 'parse-role'
  | 'match-gap'
  | 'generate-pack'
  | 'improve-bullet'
  | 'copilot-chat'
  | 'resume-summary'
  | 'interview-feedback'
  | 'interview-curriculum'
  | 'resume-portfolio-plan'
  | 'workflow-blueprint'
  | 'ai-readiness'
  | 'horizon-expansion-plan'
  | 'horizon-risk-audit'
  | 'ai-transformation-plan'

interface CounterState {
  count: number
  resetAt: number
}

interface FeatureQuota {
  free: number
  pro: number
  windowMs: number
}

const FEATURE_QUOTAS: Record<FeatureKey, FeatureQuota> = {
  'parse-role': { free: 40, pro: 300, windowMs: 60 * 60 * 1000 },
  'match-gap': { free: 25, pro: 180, windowMs: 60 * 60 * 1000 },
  'generate-pack': { free: 8, pro: 80, windowMs: 60 * 60 * 1000 },
  'improve-bullet': { free: 80, pro: 500, windowMs: 60 * 60 * 1000 },
  'copilot-chat': { free: 60, pro: 400, windowMs: 60 * 60 * 1000 },
  'resume-summary': { free: 40, pro: 280, windowMs: 60 * 60 * 1000 },
  'interview-feedback': { free: 50, pro: 320, windowMs: 60 * 60 * 1000 },
  'interview-curriculum': { free: 28, pro: 220, windowMs: 60 * 60 * 1000 },
  'resume-portfolio-plan': { free: 30, pro: 260, windowMs: 60 * 60 * 1000 },
  'workflow-blueprint': { free: 24, pro: 180, windowMs: 60 * 60 * 1000 },
  'ai-readiness': { free: 80, pro: 600, windowMs: 60 * 60 * 1000 },
  'horizon-expansion-plan': { free: 18, pro: 140, windowMs: 60 * 60 * 1000 },
  'horizon-risk-audit': { free: 24, pro: 180, windowMs: 60 * 60 * 1000 },
  'ai-transformation-plan': { free: 18, pro: 140, windowMs: 60 * 60 * 1000 },
}

const counters = new Map<string, CounterState>()

export interface AIUsageResult {
  allowed: boolean
  plan: PlanTier
  limit: number
  remaining: number
  retryAfterSec: number
  resetAt: number
}

function cleanupExpiredCounters() {
  if (counters.size < 2000) return
  const now = Date.now()
  for (const [key, state] of counters.entries()) {
    if (state.resetAt <= now) counters.delete(key)
  }
}

async function getUserPlan(supabase: any, userId: string): Promise<PlanTier> {
  try {
    const { data } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', userId)
      .single()

    if (data?.plan === 'pro') return 'pro'
  } catch {
    // Default to free when billing row is missing or query fails.
  }
  return 'free'
}

export async function consumeAIUsageQuota(
  supabase: any,
  userId: string,
  feature: FeatureKey
): Promise<AIUsageResult> {
  cleanupExpiredCounters()
  const plan = await getUserPlan(supabase, userId)
  const quota = FEATURE_QUOTAS[feature]
  const limit = plan === 'pro' ? quota.pro : quota.free

  const key = `${feature}:${plan}:${userId}`
  const now = Date.now()
  const existing = counters.get(key)
  let state: CounterState

  if (!existing || existing.resetAt <= now) {
    state = { count: 0, resetAt: now + quota.windowMs }
  } else {
    state = existing
  }

  state.count += 1
  counters.set(key, state)

  const remaining = Math.max(0, limit - state.count)
  const allowed = state.count <= limit
  const retryAfterSec = Math.max(1, Math.ceil((state.resetAt - now) / 1000))

  return {
    allowed,
    plan,
    limit,
    remaining,
    retryAfterSec,
    resetAt: state.resetAt,
  }
}

export function buildRateLimitHeaders(result: AIUsageResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  }
}
