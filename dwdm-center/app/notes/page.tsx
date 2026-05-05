import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'
import Link from 'next/link'

initSchema()

export default function NotesPage() {
  const s = getSession()
  if (!s) redirect('/login')
  const notes = db.prepare(`
    SELECT n.*, sec.title as section_title, sec.slug, p.level
    FROM notes n
    JOIN sections sec ON n.section_id = sec.id
    JOIN products p ON sec.product_id = p.id
    WHERE n.user_id = ?
    ORDER BY n.updated_at DESC
  `).all(s.id) as any[]

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-tx-1">📝 My Notes</h1>
            <p className="text-tx-3 text-sm mt-1">{notes.length} note{notes.length!==1?'s':''} across all courses</p>
          </div>
        </div>
        {notes.length === 0 ? (
          <div className="bg-bg-3 border border-white/5 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-tx-3">No notes yet. Open a course section and start taking notes.</p>
            <Link href="/course" className="inline-block mt-4 text-cy-4 text-sm hover:underline">Go to Courses →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-bg-3 border border-white/5 hover:border-cy-4/20 rounded-xl p-5 transition">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <Link href={`/course?level=${note.level}&slug=${note.slug}`} className="text-cy-4 text-xs font-medium hover:underline">{note.section_title}</Link>
                  <span className="text-tx-3 text-xs flex-shrink-0">{new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-tx-2 text-sm leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
