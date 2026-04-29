// app/api/admin/periods/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { evaluationPeriods, evaluationForms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params
    const body = await req.json()

    const existing = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.id, id),
    })
    if (!existing) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })

    // B11: periode closed tidak bisa edit tanggal
    if (existing.status === 'closed' && (body.startDate || body.endDate || body.label)) {
      return NextResponse.json({ error: 'Periode yang sudah ditutup tidak dapat diedit' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.label)     updateData.label     = body.label.trim()
    if (body.type)      updateData.type      = body.type
    if (body.startDate) updateData.startDate = new Date(body.startDate)
    if (body.endDate)   updateData.endDate   = new Date(body.endDate)
    if (body.status)    updateData.status    = body.status

    // Validasi tanggal jika keduanya diubah
    const newStart = updateData.startDate ?? existing.startDate
    const newEnd   = updateData.endDate   ?? existing.endDate
    if (new Date(newStart as string) >= new Date(newEnd as string)) {
      return NextResponse.json({ error: 'Tanggal mulai harus sebelum tanggal selesai' }, { status: 400 })
    }

    const [updated] = await db
      .update(evaluationPeriods)
      .set(updateData)
      .where(eq(evaluationPeriods.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate periode' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params

    // Cek apakah ada submission di periode ini
    const hasSubmission = await db.query.evaluationForms.findFirst({
      where: eq(evaluationForms.periodId, id),
    })
    if (hasSubmission) {
      return NextResponse.json(
        { error: 'Periode tidak dapat dihapus karena sudah memiliki data evaluasi' },
        { status: 400 }
      )
    }

    await db.delete(evaluationPeriods).where(eq(evaluationPeriods.id, id))
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus periode' }, { status: 500 })
  }
}