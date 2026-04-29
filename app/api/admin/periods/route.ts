// app/api/admin/periods/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { evaluationPeriods } from '@/lib/db/schema'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')
    const rows = await db.query.evaluationPeriods.findMany({
      orderBy: (p, { desc }) => [desc(p.startDate)],
    })
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { label, type, startDate, endDate } = await req.json()

    if (!label?.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: 'Label, tanggal mulai, dan tanggal selesai wajib diisi' }, { status: 400 })
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json({ error: 'Tanggal mulai harus sebelum tanggal selesai' }, { status: 400 })
    }

    const [period] = await db.insert(evaluationPeriods).values({
      label:     label.trim(),
      type:      type ?? 'monthly',
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      status:    'open',
    }).returning()

    return NextResponse.json(period, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat periode' }, { status: 500 })
  }
}