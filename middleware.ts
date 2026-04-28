// middleware.ts (di root project, sejajar dengan app/)
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'
import { SESSION_COOKIE } from '@/lib/auth/session'

// Definisi akses per route prefix
const ROUTE_ROLES: Record<string, string[]> = {
  '/admin':    ['admin', 'superadmin'],
  '/ga':       ['ga_staff', 'admin', 'superadmin'],
  '/evaluate': ['user'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Tentukan role yang dibutuhkan untuk route ini
  const requiredRoles = Object.entries(ROUTE_ROLES).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1]

  // Route publik → lewat
  if (!requiredRoles) return NextResponse.next()

  // Cek token
  const token = req.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifyJWT(token)

  if (!payload) {
    // Token expired atau invalid
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  // Cek role
  if (!requiredRoles.includes(payload.role)) {
    // Login tapi tidak punya akses → redirect ke halaman sesuai role
    return NextResponse.redirect(new URL(getHomeByRole(payload.role), req.url))
  }

  return NextResponse.next()
}

function getHomeByRole(role: string): string {
  switch (role) {
    case 'superadmin':
    case 'admin':    return '/admin/dashboard'
    case 'ga_staff': return '/ga/dashboard'
    case 'user':     return '/evaluate'
    default:         return '/login'
  }
}

export const config = {
  matcher: ['/admin/:path*', '/ga/:path*', '/evaluate/:path*'],
}