import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'

initSchema()

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey || !webhookSecret) return NextResponse.json({ ignored: true })
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') || ''
  let event: any
  try { event = stripe.webhooks.constructEvent(body, sig, webhookSecret) }
  catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  if (event.type === 'checkout.session.completed') {
    const sess = event.data.object
    const userId = sess.metadata?.user_id
    const productId = sess.metadata?.product_id
    if (userId && productId) {
      db.prepare('INSERT OR IGNORE INTO enrollments (user_id,product_id,stripe_session_id) VALUES (?,?,?)').run(userId, productId, sess.id)
      db.prepare('UPDATE stripe_sessions SET status="completed" WHERE session_id=?').run(sess.id)
    }
  }
  return NextResponse.json({ received: true })
}
