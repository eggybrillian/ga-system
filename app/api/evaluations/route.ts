// app/api/evaluations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  evaluationForms,
  evaluationScores,
  evaluationPeriods,
  objectUserAssignments,
  questions,
  objects,
  adminFlags,
  notifications,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { calcGAScores, getSettings } from '@/lib/scoring/calculator'

type ScoreInput = {
  questionId: string
  score:      number
  comment?:   string
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('user')
    const { objectId, scores, isDraft } = await req.json() as {
      objectId: string
      scores:   ScoreInput[]
      isDraft:  boolean
    }

    if (!objectId || !scores?.length) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // B3: cek ada periode open
    const period = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.status, 'open'),
    })
    if (!period) {
      return NextResponse.json({ error: 'Tidak ada periode evaluasi yang aktif' }, { status: 400 })
    }

    // B2: cek user di-assign ke objek ini
    const assignment = await db.query.objectUserAssignments.findFirst({
      where: and(
        eq(objectUserAssignments.objectId, objectId),
        eq(objectUserAssignments.userId, session.id),
      ),
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke objek ini' }, { status: 403 })
    }

    // B1: cek apakah sudah ada form (untuk update draft)
    const existingForm = await db.query.evaluationForms.findFirst({
      where: and(
        eq(evaluationForms.objectId, objectId),
        eq(evaluationForms.userId, session.id),
        eq(evaluationForms.periodId, period.id),
      ),
    })

    // Jika sudah submitted (bukan draft) → tolak
    if (existingForm && !existingForm.isDraft) {
      return NextResponse.json({ error: 'Evaluasi sudah disubmit dan tidak dapat diubah' }, { status: 400 })
    }

    // Ambil data pertanyaan untuk isi kategori
    const questionIds  = scores.map(s => s.questionId)
    const questionRows = await db.query.questions.findMany({
      where: (q, { inArray }) => inArray(q.id, questionIds),
    })
    const questionMap = new Map(questionRows.map(q => [q.id, q]))

    // Validasi semua score 1–5
    for (const s of scores) {
      if (s.score < 1 || s.score > 5) {
        return NextResponse.json({ error: `Skor tidak valid untuk pertanyaan ${s.questionId}` }, { status: 400 })
      }
    }

    await db.transaction(async (tx) => {
      let formId: string

      if (existingForm) {
        // Update draft yang ada
        await tx
          .update(evaluationForms)
          .set({
            isDraft:     isDraft,
            submittedAt: isDraft ? null : new Date(),
            updatedAt:   new Date(),
          })
          .where(eq(evaluationForms.id, existingForm.id))

        // Hapus scores lama
        await tx
          .delete(evaluationScores)
          .where(eq(evaluationScores.formId, existingForm.id))

        formId = existingForm.id
      } else {
        // Buat form baru
        const [newForm] = await tx
          .insert(evaluationForms)
          .values({
            objectId:    objectId,
            userId:      session.id,
            periodId:    period.id,
            isDraft:     isDraft,
            submittedAt: isDraft ? null : new Date(),
          })
          .returning()
        formId = newForm.id
      }

      // Insert scores baru
      await tx.insert(evaluationScores).values(
        scores.map(s => ({
          formId,
          questionId: s.questionId,
          category:   questionMap.get(s.questionId)!.category,
          score:      s.score,
          comment:    s.comment ?? null,
        }))
      )
    })

    if (!isDraft) {
      const objectRow = await db.query.objects.findFirst({
        where: eq(objects.id, objectId),
        with: { picGa: true },
      })

      if (objectRow?.picGaId) {
        const dbSettings = await getSettings()
        const weights = {
          facility_quality: dbSettings.weight_facility_quality,
          service_performance: dbSettings.weight_service_performance,
          user_satisfaction: dbSettings.weight_user_satisfaction,
        }

        const gaScores = await calcGAScores(period.id, weights, dbSettings.threshold)
        const targetGa = gaScores.find((ga) => ga.gaId === objectRow.picGaId)

        if (targetGa?.isBelow) {
          const message = `Skor GA ${targetGa.gaName} berada di bawah threshold (${targetGa.finalScore?.toFixed(1) ?? '-'} < ${dbSettings.threshold}%).`

          const adminRows = await db.query.adminFlags.findMany({
            where: eq(adminFlags.isActive, true),
          })

          const notificationRows: Array<typeof notifications.$inferInsert> = [
            ({
              recipientType: 'ga_staff',
              recipientId: objectRow.picGaId,
              message,
              trigger: 'below_threshold',
            } as typeof notifications.$inferInsert),
            ...adminRows.map((admin) => ({
              recipientType: 'admin',
              recipientId: admin.id,
              message,
              trigger: 'below_threshold',
            } as typeof notifications.$inferInsert)),
          ]

          await db.insert(notifications).values(notificationRows)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Draft tersimpan' : 'Evaluasi berhasil disubmit',
    })
  } catch (err) {
    console.error('[evaluations POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}