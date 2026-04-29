'use client'

import { useEffect, useState } from 'react'

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


// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [period, setPeriod]     = useState<Period | null>(null)
  const [gaScores, setGAScores] = useState<GAScore[]>([])
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">

          {/* Page header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
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
  )
}