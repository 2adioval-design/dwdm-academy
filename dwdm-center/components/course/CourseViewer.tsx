'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  product: any; sections: any[]; progressMap: Record<number,any>
  bookmarkSet: number[]; notes: any[]; enrolled: boolean
  currentSlug: string; userId: number; allProducts: any[]; enrolledLevels: number[]
}

export default function CourseViewer({ product, sections, progressMap, bookmarkSet: bsInit, notes: notesInit, enrolled, currentSlug, userId, allProducts, enrolledLevels }: Props) {
  const router = useRouter()
  const [activeSlug, setActiveSlug] = useState(currentSlug)
  const [progress, setProgress] = useState<Record<number,any>>(progressMap)
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set(bsInit))
  const [notes, setNotes] = useState<any[]>(notesInit)
  const [noteText, setNoteText] = useState('')
  const [editingNote, setEditingNote] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeSection = sections.find(s => s.slug === activeSlug) || sections[0]
  const sectionNotes = notes.filter(n => n.section_id === activeSection?.id)
  const currentIndex = sections.findIndex(s => s.slug === activeSlug)
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null

  const isCompleted = activeSection ? !!progress[activeSection.id]?.completed : false
  const isBookmarked = activeSection ? bookmarks.has(activeSection.id) : false

  const markComplete = useCallback(async () => {
    if (!activeSection || !enrolled) return
    const wasCompleted = !!progress[activeSection.id]?.completed
    setSaving(true)
    const res = await fetch('/api/progress', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ section_id: activeSection.id, completed: !wasCompleted })
    })
    if (res.ok) {
      const data = await res.json()
      setProgress(p => ({ ...p, [activeSection.id]: { ...p[activeSection.id], completed: !wasCompleted } }))
    }
    setSaving(false)
  }, [activeSection, enrolled, progress])

  const toggleBookmark = useCallback(async () => {
    if (!activeSection || !enrolled) return
    await fetch('/api/bookmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({section_id:activeSection.id}) })
    setBookmarks(b => { const nb = new Set(b); nb.has(activeSection.id) ? nb.delete(activeSection.id) : nb.add(activeSection.id); return nb })
  }, [activeSection, enrolled])

  const saveNote = useCallback(async () => {
    if (!noteText.trim() || !activeSection) return
    if (editingNote) {
      await fetch('/api/notes', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:editingNote.id,content:noteText}) })
      setNotes(n => n.map(x => x.id===editingNote.id ? {...x,content:noteText} : x))
      setEditingNote(null)
    } else {
      const res = await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({section_id:activeSection.id,content:noteText}) })
      const data = await res.json()
      setNotes(n => [data, ...n])
    }
    setNoteText('')
  }, [noteText, activeSection, editingNote])

  const deleteNote = useCallback(async (id:number) => {
    await fetch('/api/notes', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) })
    setNotes(n => n.filter(x => x.id !== id))
  }, [])

  const completedCount = sections.filter(s => progress[s.id]?.completed).length
  const pct = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0

  const levelBadge = ['bg-cy-4/20 text-cy-4','bg-vi-4/20 text-vi-4','bg-em-4/20 text-em-4'][product.level-1] || 'bg-cy-4/20 text-cy-4'

  return (
    <div className="flex h-screen pt-14">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-14 bottom-0 bg-bg-2 border-r border-white/5 overflow-y-auto transition-all duration-300 z-30 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${levelBadge}`}>L{product.level}</span>
            <span className="text-tx-1 text-xs font-semibold line-clamp-1">{product.title}</span>
          </div>
          <div className="flex justify-between text-xs text-tx-3 mb-1">
            <span>{completedCount}/{sections.length} sections</span><span>{pct}%</span>
          </div>
          <div className="w-full bg-bg-1 rounded-full h-1 mb-4">
            <div className="bg-cy-4 h-1 rounded-full transition-all" style={{width:`${pct}%`}} />
          </div>
          {/* Level switcher */}
          <div className="flex gap-1 mb-4">
            {allProducts.map(p => (
              <button key={p.id} onClick={() => { if(enrolledLevels.includes(p.level)) { router.push(`/course?level=${p.level}`) } else { router.push('/pricing') } }}
                className={`flex-1 text-xs py-1 rounded font-semibold transition ${p.id===product.id ? 'bg-cy-4 text-bg-1' : 'text-tx-3 bg-bg-3 hover:bg-bg-4'}`}>
                L{p.level}
              </button>
            ))}
          </div>
          {/* Section list */}
          <div className="space-y-0.5">
            {sections.map(sec => {
              const done = !!progress[sec.id]?.completed
              const active = sec.slug === activeSlug
              const bm = bookmarks.has(sec.id)
              return (
                <button key={sec.id} onClick={() => setActiveSlug(sec.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-start gap-2 ${active ? 'bg-cy-4/10 text-cy-4 border border-cy-4/20' : 'text-tx-2 hover:bg-bg-3'}`}>
                  <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${done ? 'bg-em-4 border-em-4 text-white' : 'border-tx-3'}`}>
                    {done ? '✓' : ''}
                  </span>
                  <span className="flex-1 leading-tight">{sec.title}</span>
                  {bm && <span className="text-am-4 flex-shrink-0">🔖</span>}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'} ${notesOpen ? 'mr-80' : ''}`}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setSidebarOpen(o=>!o)} className="text-tx-3 hover:text-tx-1 p-2 rounded-lg hover:bg-bg-3 transition text-sm">
              {sidebarOpen ? '◀' : '▶'} Sections
            </button>
            <div className="flex-1" />
            {enrolled && activeSection && (
              <>
                <button onClick={toggleBookmark} className={`px-3 py-1.5 rounded-lg text-xs transition ${isBookmarked ? 'bg-am-4/20 text-am-4' : 'text-tx-3 hover:bg-bg-3'}`}>
                  🔖 {isBookmarked ? 'Saved' : 'Bookmark'}
                </button>
                <button onClick={markComplete} disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isCompleted ? 'bg-em-4/20 text-em-4 border border-em-4/30' : 'bg-cy-4 text-bg-1 hover:opacity-90'}`}>
                  {saving ? '...' : isCompleted ? '✓ Completed' : 'Mark Complete'}
                </button>
                <button onClick={() => setNotesOpen(o=>!o)} className={`px-3 py-1.5 rounded-lg text-xs transition ${notesOpen ? 'bg-vi-4/20 text-vi-4' : 'text-tx-3 hover:bg-bg-3'}`}>
                  📝 Notes {sectionNotes.length > 0 && `(${sectionNotes.length})`}
                </button>
              </>
            )}
          </div>

          {!enrolled ? (
            <div className="bg-bg-3 border border-am-4/30 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h2 className="text-tx-1 font-bold mb-2">Not Enrolled</h2>
              <p className="text-tx-3 text-sm mb-4">Enroll in Level {product.level} to access all {sections.length} sections.</p>
              <Link href="/pricing" className="inline-block bg-cy-4 text-bg-1 font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition text-sm">
                View Pricing →
              </Link>
            </div>
          ) : activeSection ? (
            <>
              <div className="mb-2 text-xs text-tx-3">Section {currentIndex + 1} of {sections.length}</div>
              <h1 className="text-xl font-bold text-tx-1 mb-6">{activeSection.title}</h1>
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeSection.content_html || activeSection.content_md || '' }} />
              {/* Navigation */}
              <div className="flex gap-3 mt-10 pt-6 border-t border-white/5">
                {prevSection ? (
                  <button onClick={() => setActiveSlug(prevSection.slug)} className="flex-1 flex items-center gap-2 bg-bg-3 hover:bg-bg-4 border border-white/5 px-4 py-3 rounded-xl text-xs text-tx-2 transition">
                    ← <span className="truncate">{prevSection.title}</span>
                  </button>
                ) : <div className="flex-1" />}
                {nextSection ? (
                  <button onClick={() => setActiveSlug(nextSection.slug)} className="flex-1 flex items-center justify-end gap-2 bg-bg-3 hover:bg-bg-4 border border-white/5 px-4 py-3 rounded-xl text-xs text-tx-2 transition">
                    <span className="truncate">{nextSection.title}</span> →
                  </button>
                ) : <div className="flex-1" />}
              </div>
            </>
          ) : (
            <div className="text-tx-3 text-center py-20">Select a section from the sidebar to begin.</div>
          )}
        </div>
      </main>

      {/* Notes panel */}
      {notesOpen && (
        <aside className="fixed right-0 top-14 bottom-0 w-80 bg-bg-2 border-l border-white/5 overflow-y-auto z-30 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-tx-1 font-semibold text-sm">📝 Notes</h3>
            <button onClick={() => setNotesOpen(false)} className="text-tx-3 hover:text-tx-1 text-lg leading-none">×</button>
          </div>
          {activeSection && <p className="text-tx-3 text-xs mb-3">For: {activeSection.title}</p>}
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Write a note for this section…"
            className="w-full bg-bg-1 border border-white/10 rounded-lg p-3 text-xs text-tx-1 placeholder-tx-3 resize-none h-24 focus:outline-none focus:border-cy-4/40"
          />
          <div className="flex gap-2 mb-4">
            <button onClick={saveNote} className="flex-1 bg-cy-4 text-bg-1 text-xs font-semibold py-2 rounded-lg hover:opacity-90 transition">
              {editingNote ? 'Update Note' : 'Save Note'}
            </button>
            {editingNote && <button onClick={() => { setEditingNote(null); setNoteText('') }} className="px-3 py-2 text-xs text-tx-3 bg-bg-3 rounded-lg">Cancel</button>}
          </div>
          <div className="space-y-2">
            {sectionNotes.map(note => (
              <div key={note.id} className="bg-bg-3 border border-white/5 rounded-lg p-3">
                <p className="text-tx-2 text-xs leading-relaxed mb-2">{note.content}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingNote(note); setNoteText(note.content) }} className="text-cy-4 text-xs hover:underline">Edit</button>
                  <button onClick={() => deleteNote(note.id)} className="text-rd-4 text-xs hover:underline">Delete</button>
                </div>
              </div>
            ))}
            {sectionNotes.length === 0 && <p className="text-tx-3 text-xs text-center py-4">No notes for this section yet.</p>}
          </div>
        </aside>
      )}
    </div>
  )
}
