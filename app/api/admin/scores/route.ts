// app/api/admin/scores/route.ts
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { getActivePeriodScores } from '@/lib/scoring/calculator'
import { db } from '@/lib/db'
import { evaluationForms, evaluationPeriods, users, objectUserAssignments } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    const { period, gaScores } = await getActivePeriodScores()

    if (!period) {
      return NextResponse.json({ period: null, gaScores: [], stats: null })
    }

    // Hitung statistik periode
    const [totalSubmissions] = await db
      .select({ count: count() })
      .from(evaluationForms)
      .where(and(
        eq(evaluationForms.periodId, period.id),
        eq(evaluationForms.isDraft, false),
      ))

    const [totalAssignments] = await db
      .select({ count: count() })
      .from(objectUserAssignments)

    const stats = {
      totalSubmissions: totalSubmissions.count,
      totalAssignments: totalAssignments.count,
      gaBelow:  gaScores.filter(g => g.isBelow).length,
      gaScored: gaScores.filter(g => g.finalScore !== null).length,
      gaTotal:  gaScores.length,
    }

    return NextResponse.json({ period, gaScores, stats })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}