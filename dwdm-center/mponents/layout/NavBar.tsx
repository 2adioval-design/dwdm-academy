'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/auth'

export default function NavBar({ user }: { user: SessionUser }) {
  const router = useRouter()
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-bg-2 border-b border-cy-4/10 flex items-center px-4 gap-4">
      <Link href="/dashboard" className="text-cy-4 font-bold text-sm flex items-center gap-1.5">
        <span className="text-lg">⬡</span> DWDM Architect Center
      </Link>
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-1 text-xs">
        {[{href:'/dashboard',l:'Dashboard'},{href:'/course',l:'Courses'},{href:'/notes',l:'Notes'},{href:'/bookmarks',l:'Bookmarks'},{href:'/pricing',l:'Pricing'}].map(n=>(
          <Link key={n.href} href={n.href} className="px-3 py-1.5 text-tx-3 hover:text-tx-1 hover:bg-bg-3 rounded-lg transition">{n.l}</Link>
        ))}
        {(user.role==='admin'||user.role==='instructor') && (
          <Link href={user.role==='admin'?'/admin':'/instructor'} className="px-3 py-1.5 text-am-4 hover:bg-am-5/10 rounded-lg transition">
            {user.role==='admin'?'Admin':'Instructor'}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-cy-4/20 border border-cy-4/30 flex items-center justify-center text-cy-4 text-xs font-bold">
          {user.name[0].toUpperCase()}
        </div>
        <button onClick={logout} className="text-tx-3 text-xs hover:text-rd-4 transition px-2 py-1 rounded">Sign out</button>
      </div>
    </nav>
  )
}
