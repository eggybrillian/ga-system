// app/api/admin/objects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    const rows = await db.query.objects.findMany({
      where: eq(objects.isDeleted, false),
      with: {
        picGa: true,
        userAssignments: { with: { user: true } },
      },
      orderBy: (o, { asc }) => [asc(o.type), asc(o.name)],
    })

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { name, type, picGaId } = await req.json()

    if (!name?.trim() || !type) {
      return NextResponse.json({ error: 'Nama dan tipe wajib diisi' }, { status: 400 })
    }

    const [obj] = await db.insert(objects).values({
      name:    name.trim(),
      type,
      picGaId: picGaId || null,
    }).returning()

    return NextResponse.json(obj, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat objek' }, { status: 500 })
  }
}