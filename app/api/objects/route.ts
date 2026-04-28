// app/api/objects/route.ts
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objectUserAssignments, objects, gaStaff, evaluationForms, evaluationPeriods } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await requireRole('user')

    // Ambil periode yang sedang open
    const activePeriod = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.status, 'open'),
    })

    // Ambil semua objek yang di-assign ke user ini
    const assignments = await db.query.objectUserAssignments.findMany({
      where: eq(objectUserAssignments.userId, session.id),
      with: {
        object: {
          with: { picGa: true },
        },
      },
    })

    // Filter objek yang tidak soft-deleted
    const activeObjects = assignments
      .map(a => a.object)
      .filter(o => !o.isDeleted)

    if (!activePeriod) {
      return NextResponse.json({
        period: null,
        objects: activeObjects.map(o => ({
          id:      o.id,
          name:    o.name,
          type:    o.type,
          picGa:   o.picGa ? { name: o.picGa.name } : null,
          status:  'no_period', // tidak ada periode aktif
        })),
      })
    }

    // Cek status submission untuk setiap objek di periode ini
    const submissions = await db.query.evaluationForms.findMany({
      where: and(
        eq(evaluationForms.userId, session.id),
        eq(evaluationForms.periodId, activePeriod.id),
      ),
    })

    const submissionMap = new Map(submissions.map(s => [s.objectId, s]))

    const result = activeObjects.map(o => {
      const form = submissionMap.get(o.id)
      return {
        id:     o.id,
        name:   o.name,
        type:   o.type,
        picGa:  o.picGa ? { name: o.picGa.name } : null,
        status: !form
          ? 'pending'
          : form.isDraft
            ? 'draft'
            : 'submitted',
        formId: form?.id ?? null,
      }
    })

    return NextResponse.json({
      period: {
        id:        activePeriod.id,
        label:     activePeriod.label,
        endDate:   activePeriod.endDate,
      },
      objects: result,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}