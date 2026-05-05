import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'

initSchema()

export default function InstructorPage() {
  const s = getSession()
  if (!s) redirect('/login')
  if (s.role !== 'instructor' && s.role !== 'admin') redirect('/dashboard')

  const products = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]

  const courseStats = products.map(p => {
    const sections = db.prepare('SELECT id FROM sections WHERE product_id=?').all(p.id) as any[]
    const enrollments = db.prepare(`
      SELECT u.id, u.name, u.email, e.created_at
      FROM enrollments e JOIN users u ON e.user_id=u.id
      WHERE e.product_id=? ORDER BY e.created_at DESC
    `).all(p.id) as any[]
    const learnerStats = enrollments.map(u => {
      const done = sections.filter(sec => {
        const pr = db.prepare('SELECT completed FROM progress WHERE user_id=? AND section_id=?').get(u.id, sec.id) as any
        return pr?.completed
      }).length
      return { ...u, done, pct: sections.length > 0 ? Math.round((done/sections.length)*100) : 0 }
    })
    return { ...p, sections, enrollments: learnerStats }
  })

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-tx-1">📊 Instructor Dashboard</h1>
          <p className="text-tx-3 text-sm mt-1">Learner progress across all levels</p>
        </div>

        <div className="space-y-8">
          {courseStats.map((p, i) => {
            const colors = ['text-cy-4 border-cy-4/20','text-vi-4 border-vi-4/20','text-em-4 border-em-4/20'][i]
            const avgPct = p.enrollments.length > 0
              ? Math.round(p.enrollments.reduce((a:number,u:any)=>a+u.pct,0) / p.enrollments.length)
              : 0
            return (
              <div key={p.id} className={`bg-bg-3 border ${colors.split(' ')[1]} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className={`font-bold text-sm ${colors.split(' ')[0]}`}>Level {p.level}</span>
                  <h2 className="text-tx-1 font-semibold">{p.title}</h2>
                  <span className="ml-auto text-tx-3 text-xs">{p.enrollments.length} learner{p.enrollments.length!==1?'s':''} · avg {avgPct}%</span>
                </div>
                {p.enrollments.length === 0 ? (
                  <p className="text-tx-3 text-sm">No learners enrolled yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-tx-3 border-b border-white/5">
                          <th className="text-left pb-2 font-medium">Learner</th>
                          <th className="text-left pb-2 font-medium">Email</th>
                          <th className="text-left pb-2 font-medium">Progress</th>
                          <th className="text-left pb-2 font-medium">Sections</th>
                          <th className="text-left pb-2 font-medium">Enrolled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {p.enrollments.map((u:any) => (
                          <tr key={u.id}>
                            <td className="py-2.5 text-tx-1 font-medium">{u.name}</td>
                            <td className="py-2.5 text-tx-3">{u.email}</td>
                            <td className="py-2.5 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-bg-1 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${colors.split(' ')[0].replace('text-','bg-')}`} style={{width:`${u.pct}%`}} />
                                </div>
                                <span className="text-tx-3 w-8">{u.pct}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-tx-3">{u.done}/{p.sections.length}</td>
                            <td className="py-2.5 text-tx-3">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
