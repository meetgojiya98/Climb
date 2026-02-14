import {
  ENTERPRISE_FEATURE_CATALOG,
  buildDefaultFeatureSuite,
  buildDefaultRollout,
  isEnterpriseFeatureId,
  summarizeFeatureSuite,
  type EnterpriseFeatureWithRollout,
  type EnterpriseFeatureStatus,
} from "@/lib/enterprise-feature-suite"

export interface EnterpriseRolloutUpdate {
  featureId: string
  status: EnterpriseFeatureStatus
  priority: number
  owner: string
  notes: string
  lastRunAt?: string | null
}

function isMissingRelationError(message: string): boolean {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export async function loadEnterpriseFeaturesForUser(supabase: any, userId: string) {
  const defaults = buildDefaultFeatureSuite()

  const result = await supabase
    .from("enterprise_feature_rollouts")
    .select("feature_id, status, priority, owner, notes, last_run_at, updated_at")
    .eq("user_id", userId)

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }

  if (!Array.isArray(result.data) || result.data.length === 0) {
    return {
      features: defaults,
      summary: summarizeFeatureSuite(defaults),
      persistenceEnabled: !result.error,
    }
  }

  const lookup = new Map<string, any>()
  for (const row of result.data) {
    if (!row?.feature_id || !isEnterpriseFeatureId(String(row.feature_id))) continue
    lookup.set(String(row.feature_id), row)
  }

  const merged: EnterpriseFeatureWithRollout[] = ENTERPRISE_FEATURE_CATALOG.map((feature) => {
    const db = lookup.get(feature.id)
    const fallback = buildDefaultRollout(feature.id)
    return {
      ...feature,
      featureId: feature.id,
      status: (db?.status as EnterpriseFeatureStatus) || fallback.status,
      priority: clamp(Number(db?.priority ?? fallback.priority), 0, 100),
      owner: String(db?.owner || fallback.owner),
      notes: String(db?.notes || fallback.notes),
      lastRunAt: db?.last_run_at || fallback.lastRunAt,
      updatedAt: db?.updated_at || fallback.updatedAt,
    }
  })

  return {
    features: merged,
    summary: summarizeFeatureSuite(merged),
    persistenceEnabled: !result.error,
  }
}

export async function upsertEnterpriseRollouts(supabase: any, userId: string, updates: EnterpriseRolloutUpdate[]) {
  if (updates.length === 0) return { applied: 0, persistenceEnabled: true }

  const rows = updates
    .filter((item) => isEnterpriseFeatureId(item.featureId))
    .map((item) => ({
      user_id: userId,
      feature_id: item.featureId,
      status: item.status,
      priority: clamp(Number(item.priority), 0, 100),
      owner: item.owner.trim() || "AI Program Owner",
      notes: item.notes.trim(),
      last_run_at: item.lastRunAt || null,
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return { applied: 0, persistenceEnabled: true }

  const result = await supabase.from("enterprise_feature_rollouts").upsert(rows, {
    onConflict: "user_id,feature_id",
  })

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }

  return {
    applied: rows.length,
    persistenceEnabled: !result.error,
  }
}

export async function writeEnterpriseRun(
  supabase: any,
  payload: {
    userId: string
    featureId?: string | null
    runKind: "sprint" | "roadmap" | "activation" | "analysis"
    body: Record<string, any>
  }
) {
  const result = await supabase.from("enterprise_feature_runs").insert({
    user_id: payload.userId,
    feature_id: payload.featureId || null,
    run_kind: payload.runKind,
    payload: payload.body,
  })

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }

  return { persistenceEnabled: !result.error }
}

export async function listEnterpriseRunsForFeature(
  supabase: any,
  input: {
    userId: string
    featureId?: string | null
    limit?: number
  }
) {
  const limit = Math.max(1, Math.min(50, Number(input.limit || 20)))
  let query = supabase
    .from("enterprise_feature_runs")
    .select("id, feature_id, run_kind, payload, created_at")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (input.featureId) {
    query = query.eq("feature_id", input.featureId)
  }

  const result = await query
  if (result.error) {
    if (isMissingRelationError(String(result.error.message || ""))) {
      return {
        runs: [] as Array<{
          id: string
          featureId: string | null
          runKind: string
          payload: Record<string, any>
          createdAt: string
        }>,
        persistenceEnabled: false,
      }
    }
    throw result.error
  }

  const rows: Array<{
    id?: string
    feature_id?: string | null
    run_kind?: string | null
    payload?: Record<string, any> | null
    created_at?: string | null
  }> = Array.isArray(result.data) ? result.data : []
  return {
    runs: rows.map((row: {
      id?: string
      feature_id?: string | null
      run_kind?: string | null
      payload?: Record<string, any> | null
      created_at?: string | null
    }) => ({
      id: String(row.id),
      featureId: row.feature_id ? String(row.feature_id) : null,
      runKind: String(row.run_kind || "analysis"),
      payload: (row.payload || {}) as Record<string, any>,
      createdAt: String(row.created_at || new Date().toISOString()),
    })),
    persistenceEnabled: true,
  }
}
