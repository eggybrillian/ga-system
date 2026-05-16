// app/api/objects/[objectId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { questions, objects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { normalizeQuestionWeight } from '@/lib/questions/weights'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    await requireRole('user')
    const { objectId } = await params

    const object = await db.query.objects.findFirst({
      where: eq(objects.id, objectId),
      with: {
        objectType: true,
      },
    })
    if (!object || !object.isActive) {
      return NextResponse.json({ error: 'Objek tidak ditemukan' }, { status: 404 })
    }

    const rows = await db.query.questions.findMany({
      where: and(
        eq(questions.objectTypeId, object.objectTypeId),
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

    return NextResponse.json({
      object,
      grouped: Object.fromEntries(
        Object.entries(grouped).map(([category, items]) => [
          category,
          items.map((item) => ({
            ...item,
            weight: normalizeQuestionWeight(item.weight) ?? item.weight,
          })),
        ])
      ),
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}