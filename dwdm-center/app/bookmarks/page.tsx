import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'
import Link from 'next/link'

initSchema()

export default function BookmarksPage() {
  const s = getSession()
  if (!s) redirect('/login')
  const bookmarks = db.prepare(`
    SELECT b.*, sec.title as section_title, sec.slug, p.level, p.title as product_title
    FROM bookmarks b
    JOIN sections sec ON b.section_id = sec.id
    JOIN products p ON sec.product_id = p.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(s.id) as any[]

  const levelColors = ['text-cy-4','text-vi-4','text-em-4']

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-tx-1">🔖 Bookmarks</h1>
          <p className="text-tx-3 text-sm mt-1">{bookmarks.length} bookmarked section{bookmarks.length!==1?'s':''}</p>
        </div>
        {bookmarks.length === 0 ? (
          <div className="bg-bg-3 border border-white/5 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🔖</div>
            <p className="text-tx-3">No bookmarks yet. Bookmark sections while studying to find them quickly.</p>
            <Link href="/course" className="inline-block mt-4 text-cy-4 text-sm hover:underline">Go to Courses →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map(bm => (
              <Link key={bm.id} href={`/course?level=${bm.level}&slug=${bm.slug}`}
                className="flex items-center gap-4 bg-bg-3 border border-white/5 hover:border-am-4/30 rounded-xl px-5 py-4 transition group">
                <span className={`text-xs font-bold ${levelColors[bm.level-1]}`}>L{bm.level}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-tx-1 text-sm font-medium group-hover:text-cy-4 transition truncate">{bm.section_title}</div>
                  <div className="text-tx-3 text-xs">{bm.product_title}</div>
                </div>
                <span className="text-am-4 text-sm">🔖</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
