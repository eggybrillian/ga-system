// app/api/admin/objects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objectTypes, objects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    const rows = await db.query.objects.findMany({
      where: eq(objects.isActive, true),
      with: {
        picGa: true,
        objectType: true,
        userAssignments: { with: { user: true } },
      },
      orderBy: (o, { asc }) => [asc(o.objectTypeId), asc(o.name)],
    })

    return NextResponse.json(rows.map((row) => ({
      ...row,
      type: row.objectType?.slug ?? 'object',
    })))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { name, type, objectTypeId: requestedObjectTypeId, picGaId } = await req.json()

    const objectTypeId = requestedObjectTypeId || (type
      ? (await db.query.objectTypes.findFirst({
          where: eq(objectTypes.slug, type),
        }))?.id
      : null)

    if (!name?.trim() || !objectTypeId) {
      return NextResponse.json({ error: 'Nama dan tipe wajib diisi' }, { status: 400 })
    }

    const [obj] = await db.insert(objects).values({
      name:    name.trim(),
      objectTypeId,
      picGaId: picGaId || null,
    }).returning()

    return NextResponse.json(obj, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat objek' }, { status: 500 })
  }
}