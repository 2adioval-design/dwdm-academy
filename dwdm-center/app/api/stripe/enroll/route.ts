import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

// Sandbox-only direct enrollment (no Stripe key required)
export async function POST(req: NextRequest) {
  const s = getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Use Stripe checkout' }, { status: 400 })
  const { product_id } = await req.json()
  db.prepare('INSERT OR IGNORE INTO enrollments (user_id,product_id) VALUES (?,?)').run(s.id, product_id)
  return NextResponse.json({ ok: true })
}
