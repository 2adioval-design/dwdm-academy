import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'
import { initSchema } from '@/lib/schema'
import NavBar from '@/components/layout/NavBar'

initSchema()

export default function AdminPage() {
  const s = getSession()
  if (!s) redirect('/login')
  if (s.role !== 'admin') redirect('/dashboard')

  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all() as any[]
  const products = db.prepare('SELECT * FROM products ORDER BY level').all() as any[]

  const stats = {
    users: users.length,
    learners: users.filter(u=>u.role==='learner').length,
    enrollments: (db.prepare('SELECT COUNT(*) as c FROM enrollments').get() as any).c,
    progress: (db.prepare('SELECT COUNT(*) as c FROM progress WHERE completed=1').get() as any).c,
    notes: (db.prepare('SELECT COUNT(*) as c FROM notes').get() as any).c,
    bookmarks: (db.prepare('SELECT COUNT(*) as c FROM bookmarks').get() as any).c,
  }

  const enrollmentsByProduct = products.map(p => {
    const count = (db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE product_id=?').get(p.id) as any).c
    const sections = (db.prepare('SELECT COUNT(*) as c FROM sections WHERE product_id=?').get(p.id) as any).c
    return { ...p, enrollCount: count, sectionCount: sections }
  })

  return (
    <div className="min-h-screen bg-bg-1">
      <NavBar user={s} />
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-tx-1">⚙️ Admin Dashboard</h1>
          <p className="text-tx-3 text-sm mt-1">Platform overview and user management</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          {[
            {label:'Total Users',val:stats.users,color:'text-cy-4'},
            {label:'Learners',val:stats.learners,color:'text-vi-4'},
            {label:'Enrollments',val:stats.enrollments,color:'text-em-4'},
            {label:'Completions',val:stats.progress,color:'text-am-4'},
            {label:'Notes',val:stats.notes,color:'text-cy-5'},
            {label:'Bookmarks',val:stats.bookmarks,color:'text-vi-5'},
          ].map(st => (
            <div key={st.label} className="bg-bg-3 border border-white/5 rounded-xl p-4 text-center">
              <div className={`text-xl font-bold ${st.color}`}>{st.val}</div>
              <div className="text-tx-3 text-xs mt-1">{st.label}</div>
            </div>
          ))}
        </div>

        {/* Course overview */}
        <div className="bg-bg-3 border border-white/5 rounded-2xl p-6 mb-8">
          <h2 className="text-tx-1 font-semibold mb-4">Course Enrollments</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {enrollmentsByProduct.map((p,i) => {
              const colors=['bg-cy-4/20 text-cy-4','bg-vi-4/20 text-vi-4','bg-em-4/20 text-em-4'][i]
              return (
                <div key={p.id} className="bg-bg-1 border border-white/5 rounded-xl p-4">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit mb-2 ${colors}`}>Level {p.level}</div>
                  <div className="text-tx-1 font-medium text-sm mb-1">{p.title}</div>
                  <div className="text-tx-3 text-xs">{p.enrollCount} enrolled · {p.sectionCount} sections</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* User table */}
        <div className="bg-bg-3 border border-white/5 rounded-2xl p-6">
          <h2 className="text-tx-1 font-semibold mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-tx-3 border-b border-white/5">
                  <th className="text-left pb-3 font-medium">Name</th>
                  <th className="text-left pb-3 font-medium">Email</th>
                  <th className="text-left pb-3 font-medium">Role</th>
                  <th className="text-left pb-3 font-medium">Enrolled</th>
                  <th className="text-left pb-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const enr = db.prepare('SELECT p.level FROM enrollments e JOIN products p ON e.product_id=p.id WHERE e.user_id=?').all(u.id) as any[]
                  const roleBadge: Record<string,string> = {admin:'bg-rd-4/20 text-rd-4', instructor:'bg-am-4/20 text-am-4', learner:'bg-cy-4/20 text-cy-4'}
                  return (
                    <tr key={u.id}>
                      <td className="py-3 text-tx-1 font-medium">{u.name}</td>
                      <td className="py-3 text-tx-3">{u.email}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleBadge[u.role]||'bg-bg-4 text-tx-3'}`}>{u.role}</span>
                      </td>
                      <td className="py-3 text-tx-3">
                        {enr.length > 0 ? enr.map((e:any)=>`L${e.level}`).join(', ') : '—'}
                      </td>
                      <td className="py-3 text-tx-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
