// lib/auth/session.ts
import { cookies } from 'next/headers'
import { verifyJWT, type JWTPayload } from './jwt'

export const SESSION_COOKIE = 'ga_session'

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyJWT(token)
}

export async function requireSession(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireRole(
  ...roles: JWTPayload['role'][]
): Promise<JWTPayload> {
  const session = await requireSession()
  if (!roles.includes(session.role)) throw new Error('Forbidden')
  return session
}