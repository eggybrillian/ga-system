// app/api/admin/members/route.ts
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { gaStaff, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    const [staffRows, userRows] = await Promise.all([
      db.query.gaStaff.findMany({
        where: eq(gaStaff.isActive, true),
        orderBy: (g, { asc }) => [asc(g.name)],
      }),
      db.query.users.findMany({
        where: eq(users.isActive, true),
        orderBy: (u, { asc }) => [asc(u.name)],
      }),
    ])

    return NextResponse.json({ gaStaff: staffRows, users: userRows })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}