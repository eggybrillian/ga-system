// app/api/objects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  objects,
  objectUserAssignments,
  gaStaff,
  evaluationPeriods,
  evaluationForms,
} from '@/lib/db/schema'

/**
 * GET /api/objects
 * List objek yang bisa dinilai user ini di periode yang sedang open
 * B2: User hanya bisa menilai objek yang di-assign ke dirinya
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const periodId = searchParams.get('periodId')

    // Ambil periode yang sedang open jika tidak specify
    let period
    if (periodId) {
      period = await db.query.evaluationPeriods.findFirst({
        where: eq(evaluationPeriods.id, periodId),
      })
    } else {
      period = await db.query.evaluationPeriods.findFirst({
        where: eq(evaluationPeriods.status, 'open'),
      })
    }

    if (!period) {
      return NextResponse.json(
        { error: 'Tidak ada periode yang sedang dibuka' },
        { status: 404 }
      )
    }

    // Ambil objek yang di-assign ke user ini
    const assignedObjects = await db
      .select({
        id: objects.id,
        name: objects.name,
        type: objects.type,
        picName: gaStaff.name,
        hasSubmitted: evaluationForms.id,
      })
      .from(objectUserAssignments)
      .innerJoin(objects, eq(objectUserAssignments.objectId, objects.id))
      .innerJoin(gaStaff, eq(objects.picGaId, gaStaff.id))
      .leftJoin(
        evaluationForms,
        and(
          eq(evaluationForms.objectId, objects.id),
          eq(evaluationForms.userId, session.id),
          eq(evaluationForms.periodId, period.id),
          eq(evaluationForms.isDraft, false)
        )
      )
      .where(
        and(
          eq(objectUserAssignments.userId, session.id),
          eq(objects.isDeleted, false)
        )
      )

    // Transform untuk response
    const result = assignedObjects.map(obj => ({
      id: obj.id,
      name: obj.name,
      type: obj.type,
      picName: obj.picName,
      hasSubmitted: !!obj.hasSubmitted,
    }))

    return NextResponse.json({
      period: {
        id: period.id,
        label: period.label,
        status: period.status,
      },
      objects: result,
    })
  } catch (err) {
    console.error('[GET /api/objects]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
