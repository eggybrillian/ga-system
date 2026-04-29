// app/api/admin/ga-staff/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { evaluationPeriods, gaStaff, objects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { calcGAScores, getSettings } from '@/lib/scoring/calculator'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')

    const { searchParams } = new URL(request.url)
    let periodId = searchParams.get('periodId')

    // Jika tidak ada periodId, gunakan periode yang open
    if (!periodId) {
      const activePeriod = await db.query.evaluationPeriods.findFirst({
        where: eq(evaluationPeriods.status, 'open'),
      })
      if (!activePeriod) {
        return NextResponse.json({ gaStaff: [], period: null })
      }
      periodId = activePeriod.id
    }

    // Ambil periode untuk informasi
    const period = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.id, periodId),
    })

    // Ambil settings untuk weights dan threshold
    const dbSettings = await getSettings()
    const weights = {
      facility_quality: dbSettings.weight_facility_quality,
      service_performance: dbSettings.weight_service_performance,
      user_satisfaction: dbSettings.weight_user_satisfaction,
    }

    // Hitung skor GA
    const gaScores = await calcGAScores(periodId, weights, dbSettings.threshold)

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
