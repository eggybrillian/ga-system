// app/api/admin/scores/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { getActivePeriodScores, calcGAScoresForPeriodIds } from '@/lib/scoring/calculator'
import { db } from '@/lib/db'
import { evaluationForms, objectUserAssignments } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')

    const { searchParams } = new URL(request.url)
    const periodIds = searchParams.getAll('periodId')

    let period = null
    let gaScores = []
    let threshold = 60

    if (periodIds && periodIds.length > 0) {
      // When multiple periodIds provided, aggregate across them
      const dbSettings = await db.query.settings.findMany()
      const settingsMap: Record<string, string> = {}
      for (const row of dbSettings) settingsMap[row.key] = row.value
      threshold = parseFloat(settingsMap.threshold ?? '60')

      gaScores = await calcGAScoresForPeriodIds(periodIds, undefined as any, threshold)
      // load period metadata for the selected ids
      const periods = await db.query.evaluationPeriods.findMany({ where: (q, { inArray }) => inArray(q.id, periodIds) })
      period = periods
    } else {
      const res = await getActivePeriodScores()
      period = res.period
      gaScores = res.gaScores
      threshold = res.threshold
    }

    if (!period) {
      return NextResponse.json({ period: null, gaScores: [], threshold, stats: null })
    }

    // Hitung statistik periode (support single or multiple periods)
    const selected = searchParams.getAll('periodId')
    let totalSubmissionsCount = 0
    if (selected && selected.length > 0) {
      // fallback: fetch minimal rows and count non-draft submissions in JS
      const forms = await db.query.evaluationForms.findMany({
        where: (q, { inArray }) => inArray(q.periodId, selected),
        columns: { id: true, isDraft: true },
      })
      totalSubmissionsCount = forms.filter(f => !f.isDraft).length
    } else if ((period as any).id) {
      const [totalSubmissions] = await db
        .select({ count: count() })
        .from(evaluationForms)
        .where(and(
          eq(evaluationForms.periodId, (period as any).id),
          eq(evaluationForms.isDraft, false),
        ))
      totalSubmissionsCount = totalSubmissions.count
    }

    const [totalAssignments] = await db
      .select({ count: count() })
      .from(objectUserAssignments)

    const stats = {
      totalSubmissions: totalSubmissionsCount,
      totalAssignments: totalAssignments.count,
      gaBelow:  gaScores.filter(g => g.isBelow).length,
      gaScored: gaScores.filter(g => g.finalScore !== null).length,
      gaTotal:  gaScores.length,
    }

    return NextResponse.json({ period, gaScores, threshold, stats })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}