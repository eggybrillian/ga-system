import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { evaluationForms } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin', 'superadmin')
    const { id: userId } = await params

    const forms = await db.query.evaluationForms.findMany({
      where: (f) => eq(evaluationForms.userId, userId),
      orderBy: [desc(evaluationForms.submittedAt)],
      with: {
        object: true,
        period: true,
        scores: {
          with: {
            question: true,
          },
        },
      },
    })

    return NextResponse.json({ forms })
  } catch (error) {
    console.error('GET /api/admin/users/[id]/evaluations error:', error)
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 })
  }
}
