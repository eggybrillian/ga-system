// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

export type JWTPayload = {
  id:   string
  nik:  string
  name: string
  role: 'user' | 'ga_staff' | 'admin' | 'superadmin'
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
const expires = process.env.JWT_EXPIRES_IN ?? '8h'

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}