'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props { products: any[]; enrolledLevels: number[]; hasSandbox: boolean }
const colors = [
  { border:'border-cy-4/20', badge:'bg-cy-4/20 text-cy-4', btn:'bg-cy-4 text-bg-1 hover:opacity-90', glow:'shadow-cy-4/10' },
  { border:'border-vi-4/20', badge:'bg-vi-4/20 text-vi-4', btn:'bg-vi-4 text-white hover:opacity-90', glow:'shadow-vi-4/10' },
  { border:'border-em-4/20', badge:'bg-em-4/20 text-em-4', btn:'bg-em-4 text-white hover:opacity-90', glow:'shadow-em-4/10' },
]

export default function PricingCards({ products, enrolledLevels, hasSandbox }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<number|null>(null)

  async function enroll(productId: number, level: number) {
    setLoading(productId)
    if (hasSandbox) {
      await fetch('/api/stripe/enroll', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({product_id:productId}) })
      router.push(`/course?level=${level}`)
    } else {
      const res = await fetch('/api/stripe/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({product_id:productId}) })
      const data = await res.json()
      if (data.redirect) router.push(data.redirect)
      else if (data.url) window.location.href = data.url
    }
    setLoading(null)
  }

  const features = [
    ['9 chapters + 2 labs','Fiber & DWDM fundamentals','Link budget calculation','Channel planning ITU-T G.694.1','Modulation formats & coherent optics'],
    ['3 advanced chapters','ROADM architecture deep dive','Advanced OSNR engineering','Coherent transmission planning','Multi-vendor interop design'],
    ['7 chapters + 1 war-room lab','Production operations mindset','PM mastery & alarm triage','Multi-vendor CLI reference','Fault case studies & RCA']
  ]

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {products.map((p, i) => {
        const c = colors[i]
        const enrolled = enrolledLevels.includes(p.level)
        return (
          <div key={p.id} className={`relative bg-bg-3 border ${c.border} rounded-2xl p-6 shadow-xl ${c.glow} flex flex-col`}>
            {i === 2 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-em-4 text-white text-xs font-bold px-3 py-1 rounded-full">Most Advanced</div>}
            <div className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-flex w-fit mb-4 ${c.badge}`}>Level {p.level}</div>
            <h3 className="text-tx-1 font-bold text-base mb-1 leading-tight">{p.title}</h3>
            <p className="text-tx-3 text-xs mb-5 leading-relaxed">{p.description}</p>
            <div className="text-3xl font-bold text-tx-1 mb-1">
              ${(p.price_cents/100).toFixed(0)}<span className="text-sm font-normal text-tx-3">/mo</span>
            </div>
            <ul className="my-5 space-y-1.5 flex-1">
              {(features[i] || []).map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-tx-2">
                  <span className="text-em-4 flex-shrink-0 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
            {enrolled ? (
              <button onClick={() => router.push(`/course?level=${p.level}`)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition ${c.btn}`}>
                Continue Learning →
              </button>
            ) : (
              <button onClick={() => enroll(p.id, p.level)} disabled={loading===p.id}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition ${c.btn} disabled:opacity-50`}>
                {loading===p.id ? 'Processing…' : hasSandbox ? 'Enroll Free (Sandbox)' : `Enroll — $${(p.price_cents/100).toFixed(0)}/mo`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
