'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────

type ObjectScore = {
  objectId:        string
  objectName:      string
  objectType:      string
  submissionCount: number
  scores: {
    facility_quality:    number | null
    service_performance: number | null
    user_satisfaction:   number | null
    final:               number | null
  }
}

type GAScore = {
  gaId:         string
  gaName:       string
  gaNik:        string
  finalScore:   number | null
  isBelow:      boolean
  objectScores: ObjectScore[]
}

type Period = {
  id:        string
  label:     string
  startDate: string
  endDate:   string
}

type Stats = {
  totalSubmissions: number
  totalAssignments: number
  gaBelow:          number
  gaScored:         number
  gaTotal:          number
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  mess: '🏠', office: '🏢', vehicle: '🚐', meeting_room: '📋',
}

const CAT_SHORT: Record<string, string> = {
  facility_quality:    'Fasilitas',
  service_performance: 'Layanan',
  user_satisfaction:   'Kepuasan',
}

const THRESHOLD = 60

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/admin/dashboard',  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )},
  { label: 'Periode',      href: '/admin/periods',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { label: 'Objek',        href: '/admin/objects',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )},
  { label: 'Pertanyaan',   href: '/admin/questions',  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { label: 'GA Staff',     href: '/admin/ga-staff',   icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { label: 'Pengaturan',   href: '/admin/settings',   icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreBar({ value, isBelow }: { value: number | null; isBelow?: boolean }) {
  if (value === null) {
    return <span className="text-white/20 text-sm">Belum ada data</span>
  }
  const color = isBelow || value < THRESHOLD
    ? 'bg-red-500'
    : value >= 80
      ? 'bg-emerald-500'
      : 'bg-amber-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-10 text-right shrink-0 ${isBelow ? 'text-red-400' : 'text-white'}`}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}

// Sidebar untuk desktop (≥lg) dan tablet collapsed (≥md)
function Sidebar({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <aside className={`
      hidden md:flex flex-col fixed top-0 left-0 h-screen z-20
      bg-[#0d1117] border-r border-white/[0.06] transition-all duration-300
      ${collapsed ? 'w-16' : 'w-56'}
    `}>
      {/* Logo */}
      <div className={`h-14 flex items-center border-b border-white/[0.06] shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'}`}>
        <div className="w-7 h-7 rounded-lg bg-[#3b82f6] flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {!collapsed && <span className="text-sm font-medium text-white/80 whitespace-nowrap">GA Admin</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg transition-colors
                ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'}
                ${active
                  ? 'bg-[#3b82f6]/15 text-blue-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
            >
              {item.icon}
              {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/[0.06] shrink-0">
        <button
          onClick={onLogout}
          title={collapsed ? 'Keluar' : undefined}
          className={`w-full flex items-center rounded-lg text-white/30 hover:text-white/60 transition-colors
            ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="text-sm">Keluar</span>}
        </button>
      </div>
    </aside>
  )
}

// Bottom nav untuk mobile (<md)
function BottomNav({ onLogout }: { onLogout: () => void }) {
  const router   = useRouter()
  const pathname = usePathname()

  // Tampilkan 4 item utama + more
  const visible = NAV_ITEMS.slice(0, 4)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0d1117]/95 backdrop-blur border-t border-white/[0.06]">
      <div className="flex items-center">
        {visible.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
                ${active ? 'text-blue-400' : 'text-white/30 hover:text-white/60'}`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          )
        })}
        {/* More button */}
        <button
          onClick={onLogout}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px]">Keluar</span>
        </button>
      </div>
    </nav>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()

  const [period, setPeriod]     = useState<Period | null>(null)
  const [gaScores, setGAScores] = useState<GAScore[]>([])
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  function fetchData() {
    setLoading(true)
    fetch('/api/admin/scores')
      .then(r => r.json())
      .then(d => {
        setPeriod(d.period)
        setGAScores(d.gaScores ?? [])
        setStats(d.stats)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // Auto-collapse sidebar di tablet
  useEffect(() => {
    function check() {
      setSidebarCollapsed(window.innerWidth < 1024 && window.innerWidth >= 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sidebarWidth = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <Sidebar collapsed={sidebarCollapsed} onLogout={handleLogout} />
      <BottomNav onLogout={handleLogout} />

      {/* Main */}
      <main className={`${sidebarWidth} transition-all duration-300 p-4 md:p-6 pb-24 md:pb-6`}>
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-semibold">Dashboard</h1>
              <p className="text-white/30 text-sm mt-0.5">
                {period ? `Periode: ${period.label}` : 'Tidak ada periode aktif'}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Stats — 2 col mobile, 4 col desktop */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Submission',        value: stats.totalSubmissions, sub: `dari ${stats.totalAssignments} penugasan`, color: 'text-blue-400' },
                { label: 'GA Dinilai',        value: `${stats.gaScored}/${stats.gaTotal}`, sub: 'memiliki data skor', color: 'text-white' },
                { label: 'Di Bawah Threshold',value: stats.gaBelow, sub: `min. ${THRESHOLD}%`, color: stats.gaBelow > 0 ? 'text-red-400' : 'text-emerald-400' },
                { label: 'Threshold',         value: `${THRESHOLD}%`, sub: 'batas minimum', color: 'text-white/60' },
              ].map(card => (
                <div key={card.label} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-1 truncate">{card.label}</p>
                  <p className={`text-xl md:text-2xl font-semibold ${card.color}`}>{card.value}</p>
                  <p className="text-white/20 text-xs mt-1 truncate">{card.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* GA Ranking table */}
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 md:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-medium text-sm">Ranking GA Staff</h2>
              {(stats?.gaBelow ?? 0) > 0 && (
                <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2.5 py-0.5">
                  {stats!.gaBelow} di bawah threshold
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-white/[0.03] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !period ? (
              <div className="p-8 text-center text-white/30 text-sm">
                Tidak ada periode aktif
              </div>
            ) : gaScores.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">
                Belum ada data skor
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {gaScores.map((ga, idx) => (
                  <div key={ga.gaId}>
                    {/* GA row */}
                    <button
                      onClick={() => setExpanded(expanded === ga.gaId ? null : ga.gaId)}
                      className="w-full text-left px-4 md:px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Rank */}
                        <span className={`text-sm font-semibold w-5 text-center tabular-nums shrink-0
                          ${idx === 0 && ga.finalScore !== null ? 'text-amber-400' : 'text-white/20'}`}>
                          {ga.finalScore !== null ? idx + 1 : '—'}
                        </span>

                        {/* Name + badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium text-sm">{ga.gaName}</p>
                            {ga.isBelow && (
                              <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                                ⚠ Threshold
                              </span>
                            )}
                          </div>
                          <p className="text-white/30 text-xs mt-0.5 truncate">
                            {ga.gaNik} · {ga.objectScores.length} objek
                          </p>
                        </div>

                        {/* Score bar — hidden on xs, shown sm+ */}
                        <div className="hidden sm:block w-36 md:w-48 shrink-0">
                          <ScoreBar value={ga.finalScore} isBelow={ga.isBelow} />
                        </div>

                        {/* Score number only on xs */}
                        <div className="sm:hidden shrink-0">
                          {ga.finalScore !== null ? (
                            <span className={`text-sm font-semibold ${ga.isBelow ? 'text-red-400' : 'text-white'}`}>
                              {ga.finalScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-white/20 text-sm">—</span>
                          )}
                        </div>

                        {/* Chevron */}
                        <svg
                          className={`w-4 h-4 text-white/20 shrink-0 transition-transform ${expanded === ga.gaId ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Score bar on mobile below name */}
                      <div className="sm:hidden mt-2 pl-8">
                        <ScoreBar value={ga.finalScore} isBelow={ga.isBelow} />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expanded === ga.gaId && (
                      <div className="bg-[#0f1117] px-4 md:px-5 py-4 space-y-3">
                        {ga.objectScores.map(obj => (
                          <div key={obj.objectId} className="bg-[#161b27] border border-white/[0.06] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span>{TYPE_ICON[obj.objectType]}</span>
                              <p className="text-sm font-medium flex-1 truncate">{obj.objectName}</p>
                              <span className="text-white/20 text-xs shrink-0">
                                {obj.submissionCount} evaluasi
                              </span>
                            </div>

                            {obj.submissionCount === 0 ? (
                              <p className="text-white/20 text-xs">Belum ada evaluasi</p>
                            ) : (
                              <div className="space-y-2">
                                {Object.entries(CAT_SHORT).map(([cat, label]) => {
                                  const raw  = obj.scores[cat as keyof typeof obj.scores]
                                  const val100 = raw !== null && raw !== undefined
                                    ? Math.round((raw / 5) * 1000) / 10
                                    : null
                                  return (
                                    <div key={cat} className="flex items-center gap-2 md:gap-3">
                                      <span className="text-white/30 text-xs w-16 md:w-20 shrink-0">{label}</span>
                                      <div className="flex-1">
                                        <ScoreBar value={val100} />
                                      </div>
                                    </div>
                                  )
                                })}
                                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 md:gap-3">
                                  <span className="text-white/50 text-xs w-16 md:w-20 shrink-0 font-medium">Final</span>
                                  <div className="flex-1">
                                    <ScoreBar
                                      value={obj.scores.final !== null && obj.scores.final !== undefined
                                        ? Math.round((obj.scores.final / 5) * 1000) / 10
                                        : null}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}