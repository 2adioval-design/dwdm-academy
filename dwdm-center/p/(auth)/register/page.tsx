'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) router.push('/dashboard')
    else { setError(data.error || 'Registration failed'); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-1 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⬡</div>
          <h1 className="text-2xl font-bold text-cy-4">DWDM Architect Center</h1>
          <p className="text-tx-3 text-sm mt-1">Create your learner account</p>
        </div>
        <div className="bg-bg-3 border border-cy-4/10 rounded-xl p-8">
          <form onSubmit={submit} className="space-y-4">
            {[['name','Full Name','John Smith','text'],['email','Email','you@company.com','email'],['password','Password','••••••••','password'],['confirm','Confirm Password','••••••••','password']].map(([field, label, placeholder, type]) => (
              <div key={field}>
                <label className="block text-tx-3 text-xs font-medium mb-1.5 uppercase tracking-wide">{label}</label>
                <input type={type} required value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                  className="w-full bg-bg-4 border border-white/5 rounded-lg px-3 py-2.5 text-tx-1 text-sm focus:outline-none focus:border-cy-4/50 transition"
                  placeholder={placeholder} />
              </div>
            ))}
            {error && <p className="text-rd-4 text-xs bg-rd-5/10 border border-rd-5/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-cy-4 to-cy-6 text-bg-1 font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 hover:opacity-90 transition">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-tx-3 text-xs text-center mt-4">Already have an account? <Link href="/login" className="text-cy-4 hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
