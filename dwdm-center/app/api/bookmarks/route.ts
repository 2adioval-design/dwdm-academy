import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = db.prepare('SELECT b.*, sec.title as section_title, sec.slug, p.level FROM bookmarks b JOIN sections sec ON b.section_id=sec.id JOIN products p ON sec.product_id=p.id WHERE b.user_id=? ORDER BY b.created_at DESC').all(s.id)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { section_id } = await req.json()
  try { db.prepare('INSERT INTO bookmarks (user_id,section_id) VALUES (?,?)').run(s.id, section_id) }
  catch { db.prepare('DELETE FROM bookmarks WHERE user_id=? AND section_id=?').run(s.id, section_id) }
  return NextResponse.json({ ok: true })
}
