type SupabaseLike = any

const FEATURE_STORE_PREFIX = "feature-store::"
const FEATURE_STORE_SCHEMA = "climb-feature-store-v1"

type StoreEnvelope<T> = {
  schema: string
  key: string
  updatedAt: string
  data: T
}

const inMemoryFeatureStore = new Map<string, unknown>()

function memoryKey(userId: string, key: string) {
  return `${userId}::${key}`
}

function nowIso() {
  return new Date().toISOString()
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

function unwrapEnvelope<T>(raw: unknown, key: string, fallback: T): T {
  if (!raw || typeof raw !== "object") return fallback
  const payload = raw as Record<string, unknown>
  if (payload.schema === FEATURE_STORE_SCHEMA && payload.key === key && "data" in payload) {
    return payload.data as T
  }
  return raw as T
}

function wrapEnvelope<T>(key: string, data: T): StoreEnvelope<T> {
  return {
    schema: FEATURE_STORE_SCHEMA,
    key,
    updatedAt: nowIso(),
    data,
  }
}

export async function readUserFeatureState<T>(
  supabase: SupabaseLike,
  userId: string,
  key: string,
  fallback: T
): Promise<{ data: T; recordId: string | null; source: "supabase" | "memory" }> {
  const storeName = `${FEATURE_STORE_PREFIX}${key}`
  const memKey = memoryKey(userId, key)

  const query = await supabase
    .from("template_library")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .eq("type", "tone")
    .eq("name", storeName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (query.error) {
    if (!isMissingRelationError(String(query.error.message || ""))) {
      throw query.error
    }

    const memoryValue = inMemoryFeatureStore.has(memKey)
      ? (inMemoryFeatureStore.get(memKey) as T)
      : fallback
    return { data: memoryValue, recordId: null, source: "memory" }
  }

  if (!query.data) {
    const memoryValue = inMemoryFeatureStore.has(memKey)
      ? (inMemoryFeatureStore.get(memKey) as T)
      : fallback
    return { data: memoryValue, recordId: null, source: "memory" }
  }

  const value = unwrapEnvelope<T>(query.data.content, key, fallback)
  return {
    data: value,
    recordId: String(query.data.id),
    source: "supabase",
  }
}

export async function writeUserFeatureState<T>(
  supabase: SupabaseLike,
  userId: string,
  key: string,
  data: T,
  options?: {
    recordId?: string | null
  }
): Promise<{ recordId: string | null; source: "supabase" | "memory" }> {
  const storeName = `${FEATURE_STORE_PREFIX}${key}`
  const memKey = memoryKey(userId, key)
  const content = wrapEnvelope(key, data)

  if (options?.recordId) {
    const updated = await supabase
      .from("template_library")
      .update({ content })
      .eq("id", options.recordId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle()

    if (!updated.error && updated.data?.id) {
      return { recordId: String(updated.data.id), source: "supabase" }
    }
    if (updated.error && !isMissingRelationError(String(updated.error.message || ""))) {
      throw updated.error
    }
  }

  const inserted = await supabase
    .from("template_library")
    .insert({
      user_id: userId,
      type: "tone",
      name: storeName,
      content,
    })
    .select("id")
    .single()

  if (inserted.error) {
    if (!isMissingRelationError(String(inserted.error.message || ""))) {
      throw inserted.error
    }

    inMemoryFeatureStore.set(memKey, data)
    return { recordId: null, source: "memory" }
  }

  return {
    recordId: String(inserted.data.id),
    source: "supabase",
  }
}
