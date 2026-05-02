'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────

type UserItem = {
  id:                 string
  name:               string
  email:              string
  nik:                string
  department:         string
  isActive:           boolean
  totalEvaluations:   number
  lastSubmittedAt:    string | null
  lastSubmittedObject: string | null
  lastSubmittedPeriod: string | null
  createdAt:          string
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  function fetchUsers(query: string = '') {
    setLoading(true)
    
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    
    fetch(`/api/admin/users?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.users || [])
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value
    setSearchQuery(query)
    fetchUsers(query)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <main className="max-w-7xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <PageHeader
          title="Daftar User"
          subtitle="Data user dari Odoo dengan riwayat evaluasi"
        />

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, email, atau NIK..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-9 pr-3 py-2 bg-[#161b27] border border-white/[0.08] rounded-lg text-white text-sm placeholder-white/30 focus:border-[#3b82f6] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#161b27] border border-white/[0.08] rounded-lg text-white/30 text-sm font-medium">
            <span>{users.length}</span>
            <span className="text-white/20">hasil</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-[#161b27] border border-white/[0.08] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Users Grid/Table */}
        {!loading && users.length > 0 && (
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="w-full text-left bg-[#161b27] border border-white/[0.08] rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{user.name}</h3>
                    <span className={`text-xs border rounded-full px-2.5 py-0.5 shrink-0 ${user.isActive ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/30 bg-white/5'}`}>
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <span className="text-white/20">NIK:</span>
                      <span className="font-mono">{user.nik}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-1">
                        <span className="text-white/20">Email:</span>
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-1">
                        <span className="text-white/20">Dept:</span>
                        <span className="truncate">{user.department}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-white/20">Evaluasi:</span>
                      <span className="font-semibold text-white">{user.totalEvaluations}</span>
                    </div>
                  </div>
                  {user.lastSubmittedPeriod && (
                    <div className="mt-2 text-xs text-white/30 flex items-center gap-2">
                      <span>📋 {user.lastSubmittedPeriod} ({user.lastSubmittedObject})</span>
                      <span className="text-white/20">•</span>
                      <span>{formatDate(user.lastSubmittedAt)}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-lg p-12 text-center">
            <p className="text-white/30 text-sm">
              {searchQuery ? 'Tidak ada user yang cocok dengan pencarian' : 'Belum ada data user'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
