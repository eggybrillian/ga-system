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
      <main className="max-w-7xl mx-auto px-4 md:px-2 py-4 space-y-5">
        <PageHeader
          title="Daftar User"
          subtitle="Data user dari Odoo dengan riwayat evaluasi"
        />

        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, email, atau NIK..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-9 pr-3 py-2.5 bg-[#161b27] border border-white/[0.08] rounded-lg text-white text-sm placeholder-white/30 focus:border-[#3b82f6] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center justify-between lg:justify-center gap-2 px-3 py-2.5 bg-[#161b27] border border-white/[0.08] rounded-lg text-white/30 text-sm font-medium lg:min-w-28">
            <span className="text-white/70">{users.length}</span>
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
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161b27]">
            <div className="hidden lg:grid grid-cols-[minmax(0,1.75fr)_0.9fr_1fr_0.9fr_1.35fr] gap-2 px-4 py-2.5 border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/25">
              <div>User</div>
              <div>NIK</div>
              <div>Departemen</div>
              <div>Evaluasi</div>
              <div>Terakhir</div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="w-full text-left px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.75fr)_0.9fr_1fr_0.9fr_1.35fr] gap-2 lg:items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${user.isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                        <span className="text-[12px] font-semibold text-white/80">
                          {user.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(part => part[0]?.toUpperCase())
                            .join('') || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-[14px] text-white truncate max-w-full">{user.name}</h3>
                          {!user.isActive && (
                            <span className="text-[10px] border rounded-full px-1.5 py-0.5 shrink-0 border-white/10 text-white/30 bg-white/5">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        {user.lastSubmittedPeriod && (
                          <p className="mt-1 text-[11px] text-white/30 lg:hidden truncate">
                            📋 {user.lastSubmittedPeriod} {user.lastSubmittedObject ? `(${user.lastSubmittedObject})` : ''} · {formatDate(user.lastSubmittedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[12px] text-white/40 lg:justify-start">
                      <span className="lg:hidden text-white/20">NIK:</span>
                      <span className="font-mono text-white/70 truncate">{user.nik}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[12px] text-white/40 lg:justify-start">
                      <span className="lg:hidden text-white/20">Dept:</span>
                      <span className="truncate text-white/70">{user.department || '—'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[12px] text-white/40 lg:justify-start">
                      <span className="lg:hidden text-white/20">Eval:</span>
                      <span className="font-semibold text-white">{user.totalEvaluations}</span>
                      <span className="text-white/20">data</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 text-[12px] text-white/40 min-w-0">
                      {user.lastSubmittedPeriod ? (
                        <>
                          <span className="truncate text-white/70">{user.lastSubmittedPeriod} {user.lastSubmittedObject ? `(${user.lastSubmittedObject})` : ''}</span>
                          <span className="text-white/15 shrink-0">•</span>
                          <span className="shrink-0">{formatDate(user.lastSubmittedAt)}</span>
                        </>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
