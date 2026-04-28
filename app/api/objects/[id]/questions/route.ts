// app/api/objects/[id]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { objects, questions, objectUserAssignments } from '@/lib/db/schema'

/**
 * GET /api/objects/[id]/questions
 * Ambil pertanyaan sesuai tipe objek, dikelompokkan per kategori
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const objectId = (await params).id

    // Cek user berhak akses objek ini (B2)
    const hasAccess = await db.query.objectUserAssignments.findFirst({
      where: and(
        eq(objectUserAssignments.objectId, objectId),
        eq(objectUserAssignments.userId, session.id)
      ),
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ambil tipe objek
    const objData = await db.query.objects.findFirst({
      where: eq(objects.id, objectId),
    })

    if (!objData) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 })
    }

    // Ambil pertanyaan untuk tipe objek ini, dikelompokkan per kategori
    const allQuestions = await db
      .select()
      .from(questions)
      .where(and(eq(questions.objectType, objData.type), eq(questions.isActive, true)))
      .orderBy(questions.sortOrder)

    const grouped = {
      facility_quality: allQuestions.filter(q => q.category === 'facility_quality'),
      service_performance: allQuestions.filter(q => q.category === 'service_performance'),
      user_satisfaction: allQuestions.filter(q => q.category === 'user_satisfaction'),
    }

    return NextResponse.json({
      object: {
        id: objData.id,
        name: objData.name,
        type: objData.type,
      },
      questions: grouped,
    })
  } catch (err) {
    console.error('[GET /api/objects/[id]/questions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
