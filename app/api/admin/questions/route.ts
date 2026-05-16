// app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { objectTypes, questions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizeQuestionWeight } from '@/lib/questions/weights'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')
    const rows = await db.query.questions.findMany({
      with: {
        objectType: true,
      },
      orderBy: (q, { asc }) => [asc(q.objectTypeId), asc(q.category), asc(q.sortOrder)],
    })
    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        objectType: row.objectType?.slug ?? 'object',
        weight: normalizeQuestionWeight(row.weight) ?? row.weight,
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { objectType, category, text, weight, sortOrder } = await req.json()

    if (!objectType || !category || !text?.trim()) {
      return NextResponse.json({ error: 'Tipe objek, kategori, dan teks pertanyaan wajib diisi' }, { status: 400 })
    }

    const normalizedWeight = normalizeQuestionWeight(weight)
    if (!normalizedWeight) {
      return NextResponse.json({ error: 'Bobot pertanyaan harus salah satu dari 1, 1.5, atau 2' }, { status: 400 })
    }

    const objectTypeRow = await db.query.objectTypes.findFirst({
      where: eq(objectTypes.slug, objectType),
    })
    if (!objectTypeRow) {
      return NextResponse.json({ error: 'Tipe objek tidak ditemukan' }, { status: 400 })
    }

    const [question] = await db.insert(questions).values({
      objectTypeId: objectTypeRow.id,
      category,
      text:      text.trim(),
      weight:    normalizedWeight,
      sortOrder: sortOrder ?? 0,
      isActive:  true,
    }).returning()

    return NextResponse.json({
      ...question,
      weight: normalizeQuestionWeight(question.weight) ?? question.weight,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pertanyaan' }, { status: 500 })
  }
}
