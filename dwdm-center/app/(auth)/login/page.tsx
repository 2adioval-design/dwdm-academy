'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) router.push('/dashboard')
    else { setError(data.error || 'Login failed'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-1 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⬡</div>
          <h1 className="text-2xl font-bold text-cy-4">DWDM Architect Center</h1>
          <p className="text-tx-3 text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="bg-bg-3 border border-cy-4/10 rounded-xl p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-tx-3 text-xs font-medium mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-bg-4 border border-white/5 rounded-lg px-3 py-2.5 text-tx-1 text-sm focus:outline-none focus:border-cy-4/50 transition"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-tx-3 text-xs font-medium mb-1.5 uppercase tracking-wide">Password</label>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-bg-4 border border-white/5 rounded-lg px-3 py-2.5 text-tx-1 text-sm focus:outline-none focus:border-cy-4/50 transition"
                placeholder="••••••••" />
            </div>
            {error && <p className="text-rd-4 text-xs bg-rd-5/10 border border-rd-5/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-cy-4 to-cy-6 text-bg-1 font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 hover:opacity-90 transition mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-white/5 space-y-2 text-center">
            <p className="text-tx-3 text-xs">Don&apos;t have an account? <Link href="/register" className="text-cy-4 hover:underline">Create one</Link></p>
            <div className="text-xs text-tx-3/60 mt-3 pt-3 border-t border-white/5">
              <p className="font-medium text-tx-3 mb-1">Demo accounts:</p>
              <p>learner@dwdmacademy.com / Learner!2026</p>
              <p>instructor@dwdmacademy.com / Instructor!2026</p>
              <p>admin@dwdmacademy.com / Admin!2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
