// app/api/objects/[objectId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { questions, objects, objectUserAssignments } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    const session  = await requireRole('user')
    const { objectId } = await params

    // B2: pastikan user memang di-assign ke objek ini
    const assignment = await db.query.objectUserAssignments.findFirst({
      where: and(
        eq(objectUserAssignments.objectId, objectId),
        eq(objectUserAssignments.userId, session.id),
      ),
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const object = await db.query.objects.findFirst({
      where: eq(objects.id, objectId),
    })
    if (!object || object.isDeleted) {
      return NextResponse.json({ error: 'Objek tidak ditemukan' }, { status: 404 })
    }

    const rows = await db.query.questions.findMany({
      where: and(
        eq(questions.objectType, object.type),
        eq(questions.isActive, true),
      ),
      orderBy: (q, { asc }) => [asc(q.category), asc(q.sortOrder)],
    })

    // Kelompokkan per kategori
    const grouped: Record<string, typeof rows> = {}
    for (const q of rows) {
      if (!grouped[q.category]) grouped[q.category] = []
      grouped[q.category].push(q)
    }

    return NextResponse.json({ object, grouped })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}