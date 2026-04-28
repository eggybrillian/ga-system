// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    id:   session.id,
    nik:  session.nik,
    name: session.name,
    role: session.role,
  })
}