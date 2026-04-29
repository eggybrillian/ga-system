// app/api/admin/objects/[id]/assign-users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objectUserAssignments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

// Ganti semua assignment user untuk satu objek (replace strategy)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireRole('admin', 'superadmin')
    const { id: objectId } = await params
    const { userIds } = await req.json() as { userIds: string[] }

    await db.transaction(async (tx) => {
      // Hapus semua assignment lama
      await tx.delete(objectUserAssignments).where(eq(objectUserAssignments.objectId, objectId))

      // Insert assignment baru
      if (userIds.length > 0) {
        await tx.insert(objectUserAssignments).values(
          userIds.map(userId => ({ objectId, userId }))
        )
      }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate assignment' }, { status: 500 })
  }
}