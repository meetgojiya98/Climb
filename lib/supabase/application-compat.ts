type SupabaseLike = any

export type ApplicationCompatRow = {
  id: string
  status: string | null
  company: string | null
  position: string | null
  applied_date: string | null
  created_at: string | null
  follow_up_date: string | null
  next_action_at: string | null
  match_score: number | null
}

function normalizeApplicationRow(row: any): ApplicationCompatRow {
  const match = Number(row?.match_score)
  return {
    id: String(row?.id || ''),
    status: row?.status ? String(row.status) : null,
    company: row?.company ? String(row.company) : null,
    position: row?.position ? String(row.position) : null,
    applied_date: row?.applied_date ? String(row.applied_date) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    follow_up_date: row?.follow_up_date ? String(row.follow_up_date) : null,
    next_action_at: row?.next_action_at ? String(row.next_action_at) : null,
    match_score: Number.isFinite(match) ? match : null,
  }
}

function isMissingSchemaError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('could not find') ||
    m.includes('column') ||
    m.includes('relation')
  )
}

export async function fetchApplicationsCompatible(
  supabase: SupabaseLike,
  userId: string
): Promise<ApplicationCompatRow[]> {
  const selectVariants = [
    'id, company, position, status, applied_date, created_at, follow_up_date, next_action_at, match_score',
    'id, company, position, status, applied_date, created_at, follow_up_date, match_score',
    'id, company, position, status, applied_date, created_at, next_action_at, match_score',
    'id, company, position, status, applied_date, created_at, match_score',
    'id, status, applied_date, created_at, follow_up_date, next_action_at, match_score',
    'id, status, applied_date, created_at, follow_up_date, match_score',
    'id, status, applied_date, created_at, next_action_at, match_score',
    'id, status, applied_date, created_at, match_score',
    'id, status, created_at, match_score',
    'id, status, created_at',
  ]

  let lastError: any = null

  for (const select of selectVariants) {
    const result = await supabase
      .from('applications')
      .select(select)
      .eq('user_id', userId)

    if (!result.error) {
      return (result.data || []).map(normalizeApplicationRow)
    }

    lastError = result.error
    if (!isMissingSchemaError(String(result.error?.message || ''))) {
      break
    }
  }

  if (lastError) {
    const message = String(lastError?.message || '').toLowerCase()
    if (message.includes('relation') && message.includes('applications') && message.includes('does not exist')) {
      return []
    }
    throw lastError
  }
  return []
}
