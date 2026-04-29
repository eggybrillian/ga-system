// app/api/admin/questions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { questions, evaluationScores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params
    const body = await req.json()

    const existing = await db.query.questions.findFirst({
      where: eq(questions.id, id),
    })
    if (!existing) return NextResponse.json({ error: 'Pertanyaan tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.objectType !== undefined) updateData.objectType = body.objectType
    if (body.category !== undefined)   updateData.category   = body.category
    if (body.text !== undefined)       updateData.text       = body.text.trim()
    if (body.weight !== undefined)     updateData.weight     = body.weight
    if (body.isActive !== undefined)   updateData.isActive   = body.isActive
    if (body.sortOrder !== undefined)  updateData.sortOrder  = body.sortOrder

    const [updated] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate pertanyaan' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params

    // Cek apakah pertanyaan sudah dipakai di evaluasi
    const hasScore = await db.query.evaluationScores.findFirst({
      where: eq(evaluationScores.questionId, id),
    })
    if (hasScore) {
      return NextResponse.json(
        { error: 'Pertanyaan tidak dapat dihapus karena sudah memiliki data evaluasi' },
        { status: 400 }
      )
    }

    await db.delete(questions).where(eq(questions.id, id))
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus pertanyaan' }, { status: 500 })
  }
}
