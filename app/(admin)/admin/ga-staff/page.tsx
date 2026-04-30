'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import ActionButton from '@/components/admin/ActionButton'
import ScoreBar from '@/components/admin/ScoreBar'
import StatusBadge from '@/components/admin/StatusBadge'
import PeriodSelector from '@/components/admin/PeriodSelector'

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

type GAStaffItem = {
  id:               string
  name:             string
  nik:              string
  position?:        string
  managedObjects:   number
  finalScore:       number | null
  isBelow:          boolean
  objectScores:     ObjectScore[]
}

type Period = {
  id:        string
  label:     string
  startDate: string
  endDate:   string
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

 

// ── Main Page ──────────────────────────────────────────────────────────────

export default function GAStaffPage() {
  const [period, setPeriod]      = useState<Period | null>(null)
  const [periods, setPeriods]    = useState<Period[]>([])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([])
  const [gaStaff, setGAStaff]    = useState<GAStaffItem[]>([])
  const [loading, setLoading]    = useState(true)
  const [expanded, setExpanded]  = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  function fetchData(periodIds?: string[]) {
    setLoading(true)
    const params = new URLSearchParams()
    const ids = periodIds ?? selectedPeriodIds
    for (const id of ids) params.append('periodId', id)
    const url = `/api/admin/ga-staff?${params.toString()}`

    fetch(url)
      .then(r => r.json())
      .then(d => {
        // period may be single or array
        if (Array.isArray(d.period)) {
          setPeriod(d.period[0] ?? null)
        } else {
          setPeriod(d.period)
        }
        setGAStaff(d.gaStaff ?? [])
      })
      .catch(err => console.error('Error fetching GA staff:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // fetch periods list first to default-select latest
    fetch('/api/admin/periods')
      .then(r => r.json())
      .then((rows: Period[]) => {
        setPeriods(rows)
        if (rows.length > 0) {
          const latest = rows.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
          setSelectedPeriodIds([latest.id])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedPeriodIds.length > 0) {
      fetchData(selectedPeriodIds)
    }
  }, [selectedPeriodIds])

  // Filter by search query
  const filtered = gaStaff.filter(ga =>
    ga.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ga.nik.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const scored = gaStaff.filter(ga => ga.finalScore !== null)
  const below = scored.filter(ga => ga.isBelow)

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
      {/* Page header */}
      <PageHeader
        title="GA Staff"
        subtitle={
          selectedPeriodIds.length === 0
            ? (period ? `Periode: ${period.label}` : 'Tidak ada periode aktif')
            : selectedPeriodIds.length === 1
              ? (period ? `Periode: ${period.label}` : 'Memuat...')
              : `${selectedPeriodIds.length} terpilih`
        }
        actions={<ActionButton onClick={() => fetchData()} loading={loading}><span className="hidden sm:inline">Refresh</span></ActionButton>}
      />
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <label className="text-white/40 text-xs mr-2">Pilih Periode</label>
        <div>
          <PeriodSelector
            periods={periods}
            selected={selectedPeriodIds}
            onChange={(ids) => setSelectedPeriodIds(ids)}
          />
        </div>
      </div>

      {/* Stats */}
      {gaStaff.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Total GA Staff</p>
            <p className="text-xl md:text-2xl font-semibold text-white">{gaStaff.length}</p>
            <p className="text-white/20 text-xs mt-1">aktif</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Memiliki Skor</p>
            <p className="text-xl md:text-2xl font-semibold text-emerald-400">{scored.length}</p>
            <p className="text-white/20 text-xs mt-1">dari {gaStaff.length}</p>
          </div>
          {below.length > 0 && (
            <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Di Bawah Threshold</p>
              <p className="text-xl md:text-2xl font-semibold text-red-400">{below.length}</p>
              <p className="text-white/20 text-xs mt-1">perlu perhatian</p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Cari nama atau NIK..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Table */}
      <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="px-4 md:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-medium text-sm">Daftar GA Staff</h2>
          {below.length > 0 && (
            <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2.5 py-0.5">
              {below.length} di bawah threshold
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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">
            {searchQuery ? 'Tidak ditemukan GA staff yang sesuai' : 'Belum ada GA staff'}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((ga) => (
              <div key={ga.id}>
                {/* GA Staff row */}
                <button
                  onClick={() => setExpanded(expanded === ga.id ? null : ga.id)}
                  className="w-full text-left px-4 md:px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Name + info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{ga.name}</p>
                      <p className="text-white/30 text-xs mt-0.5 truncate">
                        {ga.nik} · {ga.managedObjects} objek
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      <StatusBadge isBelow={ga.isBelow} score={ga.finalScore} />
                    </div>

                    {/* Score — hidden on xs, shown sm+ */}
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
                      className={`w-4 h-4 text-white/20 shrink-0 transition-transform ${expanded === ga.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Score bar on mobile below name */}
                  <div className="sm:hidden mt-2 pl-0">
                    <ScoreBar value={ga.finalScore} isBelow={ga.isBelow} />
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded === ga.id && (
                  <div className="bg-[#0f1117] px-4 md:px-5 py-4 space-y-3">
                    {ga.managedObjects === 0 ? (
                      <p className="text-white/20 text-sm">Tidak ada objek yang dikelola</p>
                    ) : (
                      ga.objectScores.map(obj => (
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
                                const raw = obj.scores[cat as keyof typeof obj.scores]
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
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
