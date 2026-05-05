import { redirect } from 'next/navigation'
import { getSession, getUserEnrollments, isEnrolled } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'
import CourseViewer from '@/components/course/CourseViewer'
import { marked } from 'marked'

initSchema()

export default function CoursePage({ searchParams }: { searchParams: { level?: string; slug?: string } }) {
  const s = getSession()
  if (!s) redirect('/login')

  const level = parseInt(searchParams.level || '1')
  const product = db.prepare('SELECT * FROM products WHERE level = ?').get(level) as any
  if (!product) redirect('/pricing')

  const allProducts = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]
  const enrolledLevels = getUserEnrollments(s.id)
  const enrolled = enrolledLevels.includes(level)

  const sections = db.prepare('SELECT * FROM sections WHERE product_id = ? ORDER BY sort_order').all(product.id) as any[]

  // Render markdown to HTML for each section
  const sectionsWithHtml = sections.map(sec => ({
    ...sec,
    content_html: sec.content_md ? marked.parse(sec.content_md) : ''
  }))

  const progressRows = enrolled
    ? db.prepare('SELECT * FROM progress WHERE user_id = ? AND section_id IN (SELECT id FROM sections WHERE product_id = ?)').all(s.id, product.id) as any[]
    : []

  const progressMap: Record<number, any> = {}
  progressRows.forEach(r => { progressMap[r.section_id] = r })

  const bookmarkRows = enrolled
    ? db.prepare('SELECT section_id FROM bookmarks WHERE user_id = ? AND section_id IN (SELECT id FROM sections WHERE product_id = ?)').all(s.id, product.id) as any[]
    : []
  const bookmarkSet = bookmarkRows.map((r: any) => r.section_id)

  const notes = enrolled
    ? db.prepare('SELECT * FROM notes WHERE user_id = ? AND section_id IN (SELECT id FROM sections WHERE product_id = ?) ORDER BY updated_at DESC').all(s.id, product.id) as any[]
    : []

  const currentSlug = searchParams.slug || sections[0]?.slug || ''

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <CourseViewer
        product={product}
        sections={sectionsWithHtml}
        progressMap={progressMap}
        bookmarkSet={bookmarkSet}
        notes={notes}
        enrolled={enrolled}
        currentSlug={currentSlug}
        userId={s.id}
        allProducts={allProducts}
        enrolledLevels={enrolledLevels}
      />
    </div>
  )
}
