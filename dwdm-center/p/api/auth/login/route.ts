import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import { verifyPassword, signToken, COOKIE_NAME, COOKIE_OPTS } from '@/lib/auth'

initSchema()

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as any
  if (!user || !verifyPassword(password, user.password_hash))
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
  return res
}
