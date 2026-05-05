import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'
import { initSchema } from '@/lib/schema'

initSchema()

export async function POST(req: NextRequest) {
  const s = getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await req.json()
  const product = db.prepare('SELECT * FROM products WHERE id=?').get(product_id) as any
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    // Sandbox: enroll directly without Stripe
    db.prepare('INSERT OR IGNORE INTO enrollments (user_id,product_id) VALUES (?,?)').run(s.id, product_id)
    return NextResponse.json({ ok: true, sandbox: true, redirect: '/dashboard' })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' })
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    success_url: `${base}/dashboard?enrolled=1`,
    cancel_url: `${base}/pricing`,
    client_reference_id: String(s.id),
    metadata: { product_id: String(product_id), user_id: String(s.id) }
  })
  db.prepare('INSERT OR IGNORE INTO stripe_sessions (session_id,user_id,product_id) VALUES (?,?,?)').run(session.id, s.id, product_id)
  return NextResponse.json({ url: session.url })
}
