// app/api/evaluations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  evaluationForms,
  evaluationScores,
  evaluationPeriods,
  objectUserAssignments,
  objects,
} from '@/lib/db/schema'
import {
  submitEvaluationSchema,
  updateEvaluationDraftSchema,
} from '@/lib/validators'
import { calculateFormFinalScore } from '@/lib/scoring/calculator'

/**
 * POST /api/evaluations
 * Submit evaluasi baru atau update existing draft
 * B1: Unique constraint (object_id, user_id, period_id)
 * B3: Evaluasi hanya bisa diisi saat periode open
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = submitEvaluationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { objectId, periodId, scores } = parsed.data

    // Cek periode status (B3)
    const period = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.id, periodId),
    })

    if (!period || period.status !== 'open') {
      return NextResponse.json(
        { error: 'Periode evaluasi belum dibuka atau sudah ditutup' },
        { status: 403 }
      )
    }

    // Cek user berhak akses objek (B2)
    const hasAccess = await db.query.objectUserAssignments.findFirst({
      where: and(
        eq(objectUserAssignments.objectId, objectId),
        eq(objectUserAssignments.userId, session.id)
      ),
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: tidak berhak menilai objek ini' }, { status: 403 })
    }

    // Cek/ambil form yang sudah ada (B1)
    let form = await db.query.evaluationForms.findFirst({
      where: and(
        eq(evaluationForms.objectId, objectId),
        eq(evaluationForms.userId, session.id),
        eq(evaluationForms.periodId, periodId)
      ),
    })

    // Jika belum ada, buat baru
    if (!form) {
      const [newForm] = await db
        .insert(evaluationForms)
        .values({
          objectId,
          userId: session.id,
          periodId,
          isDraft: false,
          submittedAt: new Date(),
        })
        .returning()

      form = newForm
    } else if (!form.isDraft) {
      // Sudah submitted, tidak boleh re-submit
      return NextResponse.json(
        { error: 'Evaluasi untuk objek ini sudah disubmit' },
        { status: 409 }
      )
    }

    // Hapus scores lama jika ada
    await db.delete(evaluationScores).where(eq(evaluationScores.formId, form.id))

    // Insert scores baru
    await db.insert(evaluationScores).values(
      scores.map(s => ({
        formId: form.id,
        questionId: s.questionId,
        category: 'facility_quality' as const, // TODO: ambil dari questions table
        score: s.score,
        comment: s.comment,
      }))
    )

    // Update form status
    await db
      .update(evaluationForms)
      .set({
        isDraft: false,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evaluationForms.id, form.id))

    // Hitung skor final
    const finalScore = await calculateFormFinalScore(form.id)

    // B4: Trigger kalkulasi ulang skor GA (TODO: async job)
    // await recalculateGAScoresForPeriod(periodId)

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        finalScore,
      },
    })
  } catch (err) {
    console.error('[POST /api/evaluations]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/evaluations/[id]
 * Update draft evaluasi (belum submit)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateEvaluationDraftSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { scores } = parsed.data
    const formId = req.nextUrl.searchParams.get('id')

    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 })
    }

    // Cek form ownership
    const form = await db.query.evaluationForms.findFirst({
      where: and(eq(evaluationForms.id, formId), eq(evaluationForms.userId, session.id))
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (!form.isDraft) {
      return NextResponse.json(
        { error: 'Tidak bisa edit evaluasi yang sudah disubmit' },
        { status: 409 }
      )
    }

    // Hapus scores lama
    await db.delete(evaluationScores).where(eq(evaluationScores.formId, formId))

    // Insert scores baru
    await db.insert(evaluationScores).values(
      scores.map(s => ({
        formId,
        questionId: s.questionId,
        category: 'facility_quality' as const,
        score: s.score,
        comment: s.comment,
      }))
    )

    await db
      .update(evaluationForms)
      .set({ updatedAt: new Date() })
      .where(eq(evaluationForms.id, formId))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/evaluations]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
