import { redirect } from 'next/navigation'
import { getSession, getUserEnrollments } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'
import Link from 'next/link'

initSchema()

export default function DashboardPage() {
  const s = getSession()
  if (!s) redirect('/login')

  const products = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]
  const enrolledLevels = getUserEnrollments(s.id)
  const notes = db.prepare('SELECT COUNT(*) as c FROM notes WHERE user_id=?').get(s.id) as any
  const bmarks = db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE user_id=?').get(s.id) as any

  const enrolledProducts = products.filter(p => enrolledLevels.includes(p.level))

  const courseData = products.map(p => {
    const sections = db.prepare('SELECT * FROM sections WHERE product_id=? ORDER BY sort_order').all(p.id) as any[]
    const done = sections.filter(sec => {
      const pr = db.prepare('SELECT * FROM progress WHERE user_id=? AND section_id=?').get(s.id, sec.id) as any
      return pr?.completed
    }).length
    return { ...p, sections, done, pct: sections.length > 0 ? Math.round((done/sections.length)*100) : 0 }
  })

  const totalDone = courseData.reduce((a,c) => a + c.done, 0)
  const totalSections = courseData.reduce((a,c) => a + c.sections.length, 0)

  const recentProgress = db.prepare(`
    SELECT p.*, sec.title as section_title, sec.slug, prod.level
    FROM progress p JOIN sections sec ON p.section_id=sec.id JOIN products prod ON sec.product_id=prod.id
    WHERE p.user_id=? AND p.completed=1
    ORDER BY p.updated_at DESC LIMIT 3
  `).all(s.id) as any[]

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-tx-1">Welcome back, {s.name.split(' ')[0]} 👋</h1>
          <p className="text-tx-3 text-sm mt-1">
            {enrolledLevels.length === 0 ? 'Enroll in a level to start learning.' : `Enrolled in ${enrolledLevels.length} level${enrolledLevels.length!==1?'s':''}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label:'Sections Done', val:totalDone, sub:`of ${totalSections}`, color:'text-cy-4' },
            { label:'Courses Enrolled', val:enrolledLevels.length, sub:'active', color:'text-vi-4' },
            { label:'Notes', val:notes.c, sub:'written', color:'text-em-4' },
            { label:'Bookmarks', val:bmarks.c, sub:'saved', color:'text-am-4' },
          ].map(stat => (
            <div key={stat.label} className="bg-bg-3 border border-white/5 rounded-xl p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.val}</div>
              <div className="text-tx-3 text-xs mt-1">{stat.label}</div>
              <div className="text-tx-3/60 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Course cards */}
        <h2 className="text-lg font-semibold text-tx-1 mb-4">Your Courses</h2>
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {courseData.map(p => {
            const isEnrolled = enrolledLevels.includes(p.level)
            const colors = [
              { badge:'bg-cy-4/20 text-cy-4', bar:'bg-cy-4', border:'border-cy-4/20' },
              { badge:'bg-vi-4/20 text-vi-4', bar:'bg-vi-4', border:'border-vi-4/20' },
              { badge:'bg-em-4/20 text-em-4', bar:'bg-em-4', border:'border-em-4/20' },
            ][p.level-1]
            return (
              <div key={p.id} className={`bg-bg-3 border ${isEnrolled ? colors.border : 'border-white/5'} rounded-2xl p-5 flex flex-col`}>
                <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit mb-3 ${colors.badge}`}>Level {p.level}</div>
                <h3 className="text-tx-1 font-semibold text-sm mb-1 leading-tight">{p.title}</h3>
                <p className="text-tx-3 text-xs mb-4 flex-1 leading-relaxed line-clamp-2">{p.description}</p>
                {isEnrolled ? (
                  <>
                    <div className="flex justify-between text-xs text-tx-3 mb-1">
                      <span>{p.done}/{p.sections.length} sections</span><span>{p.pct}%</span>
                    </div>
                    <div className="w-full bg-bg-1 rounded-full h-1.5 mb-4">
                      <div className={`${colors.bar} h-1.5 rounded-full transition-all`} style={{width:`${p.pct}%`}} />
                    </div>
                    <Link href={`/course?level=${p.level}`} className={`text-center text-xs font-semibold py-2.5 rounded-lg transition ${colors.bar} text-bg-1 hover:opacity-90`}>
                      {p.pct > 0 ? 'Continue →' : 'Start Course →'}
                    </Link>
                  </>
                ) : (
                  <Link href="/pricing" className="text-center text-xs font-semibold py-2.5 rounded-lg border border-white/10 text-tx-3 hover:border-cy-4/30 hover:text-cy-4 transition">
                    Enroll — ${(p.price_cents/100).toFixed(0)}/mo
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Recent activity */}
        {recentProgress.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-tx-1 mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {recentProgress.map(r => (
                <Link key={r.id} href={`/course?level=${r.level}&slug=${r.slug}`}
                  className="flex items-center gap-3 bg-bg-3 border border-white/5 hover:border-em-4/20 rounded-xl px-4 py-3 transition text-sm">
                  <span className="text-em-4">✓</span>
                  <span className="text-tx-2 flex-1 truncate">{r.section_title}</span>
                  <span className="text-tx-3 text-xs">{new Date(r.updated_at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/notes" className="bg-bg-3 border border-white/5 hover:border-cy-4/20 px-4 py-2.5 rounded-xl text-xs text-tx-2 hover:text-cy-4 transition">📝 My Notes</Link>
          <Link href="/bookmarks" className="bg-bg-3 border border-white/5 hover:border-am-4/20 px-4 py-2.5 rounded-xl text-xs text-tx-2 hover:text-am-4 transition">🔖 Bookmarks</Link>
          <Link href="/pricing" className="bg-bg-3 border border-white/5 hover:border-vi-4/20 px-4 py-2.5 rounded-xl text-xs text-tx-2 hover:text-vi-4 transition">💳 Pricing</Link>
        </div>
      </div>
    </div>
  )
}
