import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession, getUserEnrollments } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const enrolledLevels = getUserEnrollments(s.id)
  const products = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]
  const sections = db.prepare('SELECT * FROM sections ORDER BY sort_order').all() as any[]
  const progress = db.prepare('SELECT * FROM progress WHERE user_id=?').all(s.id) as any[]
  const progressMap: Record<number, any> = {}
  progress.forEach(p => { progressMap[p.section_id] = p })
  return NextResponse.json({
    products: products.map(p => ({ ...p, enrolled: enrolledLevels.includes(p.level) })),
    sections: sections.map(s => ({ ...s, progress: progressMap[s.id] || null })),
    enrolledLevels
  })
}
