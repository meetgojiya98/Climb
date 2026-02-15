import { readUserFeatureState, writeUserFeatureState } from "@/lib/feature-store"

type SupabaseLike = any

export type ModuleStateResult<T> = {
  state: T
  recordId: string | null
}

export async function loadModuleState<T>(
  supabase: SupabaseLike,
  userId: string,
  key: string,
  fallback: T,
  sanitize: (input: unknown) => T
): Promise<ModuleStateResult<T>> {
  const store = await readUserFeatureState<T>(supabase, userId, key, fallback)
  return {
    state: sanitize(store.data),
    recordId: store.recordId,
  }
}

export async function saveModuleState<T>(
  supabase: SupabaseLike,
  userId: string,
  key: string,
  state: T,
  recordId?: string | null
) {
  return writeUserFeatureState<T>(supabase, userId, key, state, { recordId: recordId || null })
}

export function safeIso(value?: string | null) {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
