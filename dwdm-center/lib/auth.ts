import { randomBytes, pbkdf2Sync } from 'crypto'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import db from './db'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const COOKIE = 'dwdm_token'

export interface SessionUser {
  id: number; name: string; email: string; role: string
}

// ── Password hashing via Node built-in crypto (PBKDF2-SHA512) ────────────────
// Format stored in DB: pbkdf2$sha512$<hex-salt>$<hex-hash>
// No native modules required — works on every platform including Vercel Edge.

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(pw, salt, 100_000, 64, 'sha512').toString('hex')
  return `pbkdf2$sha512$${salt}$${hash}`
}

export function verifyPassword(pw: string, stored: string): boolean {
  if (!stored.startsWith('pbkdf2$')) return false
  const parts = stored.split('$')
  if (parts.length !== 4) return false
  const [, , salt, expected] = parts
  const actual = pbkdf2Sync(pw, salt, 100_000, 64, 'sha512').toString('hex')
  return actual === expected
}

// ── JWT ───────────────────────────────────────────────────────────────────────
export function signToken(user: SessionUser) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): SessionUser | null {
  try { return jwt.verify(token, SECRET) as SessionUser }
  catch { return null }
}

export function getSession(): SessionUser | null {
  try {
    const token = cookies().get(COOKIE)?.value
    if (!token) return null
    return verifyToken(token)
  } catch { return null }
}

// ── Enrollment helpers ────────────────────────────────────────────────────────
export function getUserEnrollments(userId: number): number[] {
  const rows = db
    .prepare('SELECT p.level FROM enrollments e JOIN products p ON e.product_id=p.id WHERE e.user_id=?')
    .all(userId) as { level: number }[]
  return rows.map(r => r.level)
}

export function isEnrolled(userId: number, level: number): boolean {
  return getUserEnrollments(userId).includes(level)
}

export const COOKIE_NAME = COOKIE
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}
