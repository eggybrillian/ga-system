// app/(admin)/admin/dashboard/page.tsx
import { requireRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function AdminDashboardPage() {
  let session
  try {
    session = await requireRole('admin', 'superadmin')
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-sm">Selamat datang,</p>
          <h1 className="text-2xl font-semibold">{session.name}</h1>
          <span className="inline-block mt-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
            {session.role}
          </span>
        </div>
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-6 text-white/40 text-sm">
          🚧 Admin Dashboard — coming soon
        </div>
      </div>
    </div>
  )
}