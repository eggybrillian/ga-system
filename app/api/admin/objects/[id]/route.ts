// app/api/admin/objects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objects, evaluationForms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params
    const body = await req.json()

    const existing = await db.query.objects.findFirst({ where: eq(objects.id, id) })
    if (!existing) return NextResponse.json({ error: 'Objek tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: 'Nama objek tidak boleh kosong' }, { status: 400 })
      updateData.name = body.name.trim()
    }
    if (body.type !== undefined) updateData.type = body.type
    if (body.picGaId !== undefined) updateData.picGaId = body.picGaId || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const [updated] = await db
      .update(objects)
      .set(updateData)
      .where(eq(objects.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate objek' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id } = await params

    // B10: cek apakah ada data evaluasi — jika ada, soft-delete saja
    const hasEval = await db.query.evaluationForms.findFirst({
      where: eq(evaluationForms.objectId, id),
    })

    if (hasEval) {
      return NextResponse.json(
        { error: 'Objek tidak dapat dihapus karena sudah memiliki riwayat evaluasi' },
        { status: 400 }
      )
    }

    // Hard delete jika belum ada evaluasi
    await db.delete(objects).where(eq(objects.id, id))
    return NextResponse.json({ deleted: 'hard' })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus objek' }, { status: 500 })
  }
}