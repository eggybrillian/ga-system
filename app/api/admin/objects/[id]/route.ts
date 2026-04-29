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
    const { name, type, picGaId } = await req.json()

    if (!name?.trim() || !type) {
      return NextResponse.json({ error: 'Nama dan tipe wajib diisi' }, { status: 400 })
    }

    const [updated] = await db
      .update(objects)
      .set({ name: name.trim(), type, picGaId: picGaId || null, updatedAt: new Date() })
      .where(eq(objects.id, id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Objek tidak ditemukan' }, { status: 404 })
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
      // Soft delete
      await db.update(objects).set({ isDeleted: true, updatedAt: new Date() }).where(eq(objects.id, id))
      return NextResponse.json({ deleted: 'soft' })
    }

    // Hard delete jika belum ada evaluasi
    await db.delete(objects).where(eq(objects.id, id))
    return NextResponse.json({ deleted: 'hard' })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus objek' }, { status: 500 })
  }
}