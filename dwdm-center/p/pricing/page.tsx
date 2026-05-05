import { redirect } from 'next/navigation'
import { getSession, getUserEnrollments } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'
import PricingCards from '@/components/course/PricingCards'

initSchema()

export default function PricingPage() {
  const s = getSession()
  if (!s) redirect('/login')
  const products = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]
  const enrolledLevels = getUserEnrollments(s.id)
  const hasSandbox = !process.env.STRIPE_SECRET_KEY
  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-tx-1 mb-3">DWDM Architect Certification</h1>
          <p className="text-tx-3 max-w-xl mx-auto">Three progressive certification levels. Master DWDM networks from foundations to production operations.</p>
          {hasSandbox && (
            <div className="mt-4 inline-flex items-center gap-2 bg-am-4/10 border border-am-4/30 text-am-4 text-xs px-4 py-2 rounded-lg">
              ⚡ Sandbox mode — Stripe not configured. Enrollment is free for testing.
            </div>
          )}
        </div>
        <PricingCards products={products} enrolledLevels={enrolledLevels} hasSandbox={hasSandbox} />
        <div className="mt-16 grid md:grid-cols-3 gap-6 text-center">
          {[{icon:'🎓',t:'Hands-on Labs',d:'Real CLI walkthroughs and fault injection drills on live equipment scenarios'},
            {icon:'📊',t:'Progress Tracking',d:'Track completed sections, quiz scores, and take notes throughout each level'},
            {icon:'🏆',t:'Certification',d:'Earn your DWDM Architect credential recognized by carrier and enterprise teams'}
          ].map(f=>(
            <div key={f.t} className="bg-bg-3 border border-white/5 rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-tx-1 font-semibold mb-2">{f.t}</h3>
              <p className="text-tx-3 text-sm leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
