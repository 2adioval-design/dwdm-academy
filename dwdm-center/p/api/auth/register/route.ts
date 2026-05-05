import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import { hashPassword, signToken, COOKIE_NAME, COOKIE_OPTS } from '@/lib/auth'

initSchema()

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email)
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  const hash = hashPassword(password)
  const result = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(name, email, hash, 'learner')
  const user = { id: result.lastInsertRowid as number, name, email, role: 'learner' }
  const token = signToken(user)
  const res = NextResponse.json({ ok: true, user })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
  return res
}
