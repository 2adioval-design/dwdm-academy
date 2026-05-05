import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession, getUserEnrollments } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(s.id) as any
  const enrolledLevels = getUserEnrollments(s.id)
  const progressCount = (db.prepare('SELECT COUNT(*) as c FROM progress WHERE user_id=? AND completed=1').get(s.id) as any)?.c || 0
  const notesCount = (db.prepare('SELECT COUNT(*) as c FROM notes WHERE user_id=?').get(s.id) as any)?.c || 0
  const bookmarkCount = (db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE user_id=?').get(s.id) as any)?.c || 0
  return NextResponse.json({ ...user, enrolledLevels, progressCount, notesCount, bookmarkCount })
}
