// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { users, evaluationForms, evaluationPeriods, objects } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('q')?.toLowerCase() || ''

    // Ambil semua users
    let usersList = await db.query.users.findMany({
      where: searchQuery ? (u, { or, ilike }) => or(
        ilike(u.name, `%${searchQuery}%`),
        ilike(u.email, `%${searchQuery}%`),
        ilike(u.nik, `%${searchQuery}%`)
      ) : undefined,
      orderBy: (u) => u.name,
    })

    // Untuk setiap user, ambil riwayat evaluasi
    const usersWithHistory = await Promise.all(
      usersList.map(async (user) => {
        // Hitung total form yang pernah diisi/draft
        const totalForms = await db
          .select({ count: count() })
          .from(evaluationForms)
          .where(eq(evaluationForms.userId, user.id))

        // Ambil form terbaru yang submitted (tidak draft)
        const lastSubmitted = await db.query.evaluationForms.findFirst({
          where: and(
            eq(evaluationForms.userId, user.id),
            eq(evaluationForms.isDraft, false)
          ),
          orderBy: (f) => f.submittedAt,
          with: {
            period: true,
            object: true,
          },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          nik: user.nik,
          department: user.department,
          isActive: user.isActive,
          totalEvaluations: totalForms[0]?.count || 0,
          lastSubmittedAt: lastSubmitted?.submittedAt || null,
          lastSubmittedObject: lastSubmitted?.object?.name || null,
          lastSubmittedPeriod: lastSubmitted?.period?.label || null,
          createdAt: user.createdAt,
        }
      })
    )

    return NextResponse.json({ users: usersWithHistory })
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
