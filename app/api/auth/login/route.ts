// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, gaStaff, adminFlags } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { signJWT, type JWTPayload } from '@/lib/auth/jwt'
import { SESSION_COOKIE } from '@/lib/auth/session'

const DUMMY_PASSWORD = 'password123'
const IS_DUMMY = process.env.AUTH_MODE === 'dummy'

export async function POST(req: NextRequest) {
  try {
    const { nik, password } = await req.json()

    if (!nik || !password) {
      return NextResponse.json({ error: 'NIK dan password wajib diisi' }, { status: 400 })
    }

    // ── Validasi password ─────────────────────────────────────
    if (IS_DUMMY) {
      if (password !== DUMMY_PASSWORD) {
        return NextResponse.json({ error: 'NIK atau password salah' }, { status: 401 })
      }
    } else {
      // TODO: forward ke Odoo API untuk validasi
      return NextResponse.json({ error: 'AUTH_MODE=odoo belum diimplementasi' }, { status: 501 })
    }

    // ── Tentukan role ─────────────────────────────────────────
    // Prioritas: superadmin → admin → ga_staff → user

    // 1. Cek admin_flags
    const flag = await db.query.adminFlags.findFirst({
      where: and(
        eq(adminFlags.nik, nik),
        eq(adminFlags.isActive, true)
      ),
    })

    if (flag) {
      // Admin/Superadmin → ambil data dari ga_staff
      const staff = await db.query.gaStaff.findFirst({
        where: and(eq(gaStaff.nik, nik), eq(gaStaff.isActive, true)),
      })
      if (!staff) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 401 })
      }

      const payload: JWTPayload = {
        id:   staff.id,
        nik:  staff.nik,
        name: staff.name,
        role: flag.role as JWTPayload['role'],
      }
      return issueToken(payload)
    }

    // 2. Cek ga_staff
    const staff = await db.query.gaStaff.findFirst({
      where: and(eq(gaStaff.nik, nik), eq(gaStaff.isActive, true)),
    })

    if (staff) {
      const payload: JWTPayload = {
        id:   staff.id,
        nik:  staff.nik,
        name: staff.name,
        role: 'ga_staff',
      }
      return issueToken(payload)
    }

    // 3. Cek users
    const user = await db.query.users.findFirst({
      where: and(eq(users.nik, nik), eq(users.isActive, true)),
    })

    if (user) {
      const payload: JWTPayload = {
        id:   user.id,
        nik:  user.nik,
        name: user.name,
        role: 'user',
      }
      return issueToken(payload)
    }

    return NextResponse.json({ error: 'NIK atau password salah' }, { status: 401 })

  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function issueToken(payload: JWTPayload) {
  const token = await signJWT(payload)

  const res = NextResponse.json({
    user: { id: payload.id, nik: payload.nik, name: payload.name, role: payload.role },
  })

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 jam
    path:     '/',
  })

  return res
}