import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = db.prepare('SELECT p.*, sec.slug, sec.title FROM progress p JOIN sections sec ON p.section_id=sec.id WHERE p.user_id=?').all(s.id)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { section_id, completed, quiz_score } = await req.json()
  db.prepare('INSERT INTO progress (user_id,section_id,completed,quiz_score,updated_at) VALUES (?,?,?,?,datetime("now")) ON CONFLICT(user_id,section_id) DO UPDATE SET completed=excluded.completed, quiz_score=excluded.quiz_score, updated_at=excluded.updated_at').run(s.id, section_id, completed ? 1 : 0, quiz_score ?? null)
  return NextResponse.json({ ok: true })
}
