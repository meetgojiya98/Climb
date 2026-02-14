import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExecutiveReport, toExecutiveCsv } from '@/lib/reporting'

async function fetchApplications(supabase: any, userId: string) {
  const primary = await supabase
    .from('applications')
    .select('id, company, status, applied_date, created_at, next_action_at, follow_up_date, match_score')
    .eq('user_id', userId)

  if (!primary.error) return primary.data || []

  if (!String(primary.error.message || '').toLowerCase().includes('follow_up_date')) {
    throw primary.error
  }

  const fallback = await supabase
    .from('applications')
    .select('id, company, status, applied_date, created_at, next_action_at, match_score')
    .eq('user_id', userId)

  if (fallback.error) throw fallback.error
  return (fallback.data || []).map((item: any) => ({ ...item, follow_up_date: null }))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json'

    const [applications, resumesResult, rolesResult, goalsResult, sessionsResult] = await Promise.all([
      fetchApplications(supabase, user.id),
      supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
      supabase.from('roles').select('id').eq('user_id', user.id),
      supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
      supabase.from('interview_sessions').select('id, created_at').eq('user_id', user.id),
    ])

    if (resumesResult.error) throw resumesResult.error
    if (rolesResult.error) throw rolesResult.error
    if (goalsResult.error) throw goalsResult.error
    if (sessionsResult.error) throw sessionsResult.error

    const report = buildExecutiveReport({
      applications,
      resumes: resumesResult.data || [],
      roles: rolesResult.data || [],
      goals: goalsResult.data || [],
      sessions: sessionsResult.data || [],
    })

    if (format === 'csv') {
      const csv = toExecutiveCsv(report)
      const datePart = new Date().toISOString().slice(0, 10)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="climb-executive-report-${datePart}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json(
      { success: true, report },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate executive report' },
      { status: 500 }
    )
  }
}
