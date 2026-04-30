// app/api/admin/ga-staff/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { evaluationPeriods, gaStaff, objects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { calcGAScores, calcGAScoresForPeriodIds, getSettings } from '@/lib/scoring/calculator'
import type { GAScore } from '@/lib/scoring/calculator'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { searchParams } = new URL(request.url)
    const periodIds = searchParams.getAll('periodId')

    let period: any = null
    let usePeriodId: string | null = null

    if (periodIds && periodIds.length > 0) {
      const periods = await db.query.evaluationPeriods.findMany({ where: (q, { inArray }) => inArray(q.id, periodIds) })
      period = periods
      usePeriodId = null
    } else {
      // Jika tidak ada periodId, gunakan periode yang open
      const activePeriod = await db.query.evaluationPeriods.findFirst({
        where: eq(evaluationPeriods.status, 'open'),
      })
      if (!activePeriod) {
        return NextResponse.json({ gaStaff: [], period: null })
      }
      usePeriodId = activePeriod.id
      period = activePeriod
    }

    // Ambil settings untuk weights dan threshold
    const dbSettings = await getSettings()
    const weights = {
      facility_quality: dbSettings.weight_facility_quality,
      service_performance: dbSettings.weight_service_performance,
      user_satisfaction: dbSettings.weight_user_satisfaction,
    }

    // Hitung skor GA (single period or multiple)
    let gaScores: GAScore[] = []
    if (periodIds && periodIds.length > 0) {
      gaScores = await calcGAScoresForPeriodIds(periodIds, weights, dbSettings.threshold)
    } else if (usePeriodId) {
      gaScores = await calcGAScores(usePeriodId, weights, dbSettings.threshold)
    }

    // Format response dengan info objects managed dan score
    const result = gaScores.map((ga) => ({
      id: ga.gaId,
      name: ga.gaName,
      nik: ga.gaNik,
      managedObjects: ga.objectScores.length,
      finalScore: ga.finalScore,
      isBelow: ga.isBelow,
      objectScores: ga.objectScores,
    }))

    return NextResponse.json({
      period: period || null,
      gaStaff: result,
    })
  } catch (error) {
    console.error('GA Staff API error:', error)
    return NextResponse.json(
      { error: 'Unauthorized or Server Error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
