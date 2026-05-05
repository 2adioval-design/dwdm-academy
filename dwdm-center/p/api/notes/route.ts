import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function GET(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const sectionId = searchParams.get('section_id')
  const rows = sectionId
    ? db.prepare('SELECT n.*, sec.title as section_title FROM notes n JOIN sections sec ON n.section_id=sec.id WHERE n.user_id=? AND n.section_id=? ORDER BY n.updated_at DESC').all(s.id, sectionId)
    : db.prepare('SELECT n.*, sec.title as section_title FROM notes n JOIN sections sec ON n.section_id=sec.id WHERE n.user_id=? ORDER BY n.updated_at DESC').all(s.id)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { section_id, body } = await req.json()
  if (!section_id || !body?.trim()) return NextResponse.json({ error: 'section_id and body required' }, { status: 400 })
  const r = db.prepare('INSERT INTO notes (user_id,section_id,body) VALUES (?,?,?)').run(s.id, section_id, body.trim())
  return NextResponse.json({ id: r.lastInsertRowid, ok: true })
}

export async function PUT(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, body } = await req.json()
  db.prepare('UPDATE notes SET body=?, updated_at=datetime("now") WHERE id=? AND user_id=?').run(body, id, s.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  db.prepare('DELETE FROM notes WHERE id=? AND user_id=?').run(id, s.id)
  return NextResponse.json({ ok: true })
}
