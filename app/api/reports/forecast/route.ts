import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationsCompatible } from '@/lib/supabase/application-compat'
import {
  buildForecastRecommendations,
  buildForecastScenarios,
  deriveForecastMetrics,
  toForecastCsv,
} from '@/lib/forecast'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const applications = await fetchApplicationsCompatible(supabase, user.id)

    const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json'
    const metrics = deriveForecastMetrics(applications || [])
    const scenarios = buildForecastScenarios(metrics)
    const recommendedWeeklyTarget = Math.max(5, Math.round(metrics.avgApplicationsPerWeek + 2))
    const recommendations = buildForecastRecommendations(metrics)
    const generatedAt = new Date().toISOString()

    if (format === 'csv') {
      const csv = toForecastCsv({
        generatedAt,
        metrics,
        scenarios,
        recommendedWeeklyTarget,
        recommendations,
      })
      const datePart = generatedAt.slice(0, 10)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="climb-forecast-report-${datePart}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        generatedAt,
        metrics,
        scenarios,
        recommendedWeeklyTarget,
        recommendations,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to build forecast' },
      { status: 500 }
    )
  }
}
