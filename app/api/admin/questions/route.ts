// app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { questions } from '@/lib/db/schema'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')
    const rows = await db.query.questions.findMany({
      orderBy: (q, { asc }) => [asc(q.objectType), asc(q.category), asc(q.sortOrder)],
    })
    return NextResponse.json(rows)
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

    const [question] = await db.insert(questions).values({
      objectType,
      category,
      text:      text.trim(),
      weight:    weight ?? '1.00',
      sortOrder: sortOrder ?? 0,
      isActive:  true,
    }).returning()

    return NextResponse.json(question, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pertanyaan' }, { status: 500 })
  }
}
