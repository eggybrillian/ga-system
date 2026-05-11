'use client'

import { useEffect, useState } from 'react'
import PeriodSelector from '@/components/admin/PeriodSelector'
import PageHeader from '@/components/admin/PageHeader'
import ScoreBar from '@/components/admin/ScoreBar'

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

const CAT_SHORT: Record<string, string> = {
  facility_quality:    'Fasilitas',
  service_performance: 'Layanan',
  user_satisfaction:   'Kepuasan',
}

function toPercent(score: number | null | undefined) {
  if (score === null || score === undefined) return null
  return Math.round((score / 5) * 1000) / 10
}

// default shown until settings are loaded
// threshold will be loaded from settings table via API
// (initial default kept for SSR/client hydration safety)
// const THRESHOLD = 60



// ── Main Page ──────────────────────────────────────────────────────────────

type AnalyticsData = {
  topLowestObjects: Array<{
    periodId: string
    periodLabel: string
    objectId: string
    objectName: string
    objectType: string
    gaName: string
    avgScore: number
    submissionCount: number
  }>
  topLowestQuestions: Array<{
    objectId: string
    objectName: string
    objectType: string
    gaName: string
    questions: Array<{
      groupKey: string
      periodId: string
      periodLabel: string
      questionId: string
      questionText: string
      category: string
      score: number
      responseCount: number
    }>
  }>
  criticalFeedback: Array<{
    scoreId: string
    periodId: string
    periodLabel: string
    gaName: string
    score: number
    category: string
    comment: string | null
    questionText: string
    objectName: string
  }>
  categoryAverages: Record<string, number>
}

export default function AdminDashboardPage() {
  const [period, setPeriod]           = useState<Period | null>(null)
  const [periods, setPeriods]         = useState<Period[]>([])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([])
  const [gaScores, setGAScores]       = useState<GAScore[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [analytics, setAnalytics]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [issuesTab, setIssuesTab]     = useState<'objects' | 'questions' | 'feedback'>('objects')
  const [expandedQuestionObjectId, setExpandedQuestionObjectId] = useState<string | null>(null)
  const [threshold, setThreshold]     = useState<number | null>(null)

  // sorted list for ranking (highest finalScore first)
  const sortedGAScores = [...gaScores].slice().sort((a, b) => {
    const aa = a.finalScore ?? -Infinity
    const bb = b.finalScore ?? -Infinity
    return bb - aa
  })

  useEffect(() => {
    if (selectedPeriodIds.length > 0) {
      let cancelled = false

      void (async () => {
        await Promise.resolve()
        if (cancelled) return

        setLoading(true)
        const params = new URLSearchParams()
        for (const id of selectedPeriodIds) params.append('periodId', id)

        try {
          const [scoresResponse, analyticsResponse] = await Promise.all([
            fetch(`/api/admin/scores?${params.toString()}`).then(r => r.json()),
            fetch(`/api/admin/dashboard-analytics?${params.toString()}`).then(r => r.json()),
          ])

          if (cancelled) return

          // period may be single object or array when multiple selected
          if (Array.isArray(scoresResponse.period) && scoresResponse.period.length > 0) {
            setPeriod(scoresResponse.period[0])
          } else {
            setPeriod(scoresResponse.period)
          }
          setGAScores(scoresResponse.gaScores ?? [])
          setStats(scoresResponse.stats)
          setAnalytics(analyticsResponse)
          if (typeof scoresResponse.threshold === 'number') {
            setThreshold(scoresResponse.threshold)
          } else if (scoresResponse.threshold) {
            const parsed = parseFloat(String(scoresResponse.threshold))
            if (!Number.isNaN(parsed)) setThreshold(parsed)
          }
        } catch (err) {
          console.error('Error fetching data:', err)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()

      return () => {
        cancelled = true
      }
    }
  }, [selectedPeriodIds])

  // fetch available periods for selector
  useEffect(() => {
    fetch('/api/admin/periods')
      .then(r => r.json())
      .then((rows: Period[]) => {
        setPeriods(rows)
        // default select latest period (by startDate descending)
        if (rows.length > 0) {
          const latest = rows.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
          setSelectedPeriodIds([latest.id])
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
          {/* Page header */}
          <PageHeader
            title="Dashboard"
            subtitle={
              selectedPeriodIds.length === 0
                ? (period ? `Periode: ${period.label}` : 'Tidak ada periode aktif')
                : selectedPeriodIds.length === 1
                  ? (period ? `Periode: ${period.label}` : 'Memuat...')
                  : `Periode: ${selectedPeriodIds.length} terpilih`
            }
            actions={(
              <div className="flex items-center gap-3">
                <label className="text-white/40 text-xs mr-2 hidden sm:block">Pilih Periode</label>
                <PeriodSelector
                  periods={periods}
                  selected={selectedPeriodIds}
                  onChange={(ids) => setSelectedPeriodIds(ids)}
                />
              </div>
            )}
          />

          {/* Stats — 2 col mobile, 4 col desktop */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Submission',        value: stats.totalSubmissions, sub: `dari ${stats.totalAssignments} penugasan`},
                { label: 'GA Dinilai',        value: `${stats.gaScored}/${stats.gaTotal}`, sub: 'memiliki data skor', color: 'text-white' },
                { label: 'Di Bawah Threshold',value: stats.gaBelow, sub: threshold === null ? 'memuat threshold' : `min. ${threshold}%`},
                { label: 'Threshold',         value: threshold === null ? 'Memuat...' : `${threshold}%`, sub: threshold === null ? 'mengambil pengaturan' : 'batas minimum', color: 'text-white' },
              ].map(card => (
                <div key={card.label} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-1 truncate">{card.label}</p>
                  <p className={`text-xl md:text-2xl font-semibold ${card.color}`}>{card.value}</p>
                  <p className="text-white/20 text-xs mt-1 truncate">{card.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top Issues Section */}
          {analytics && (
            <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="px-4 md:px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-medium text-sm mb-3">Isu Utama</h2>
                <div className="flex gap-2">
                  {[
                    { id: 'objects', label: 'Objek Rendah', count: analytics.topLowestObjects.length },
                    { id: 'questions', label: 'Pertanyaan Rendah', count: analytics.topLowestQuestions.length },
                    { id: 'feedback', label: 'Feedback Kritis', count: analytics.criticalFeedback.length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setIssuesTab(tab.id as typeof issuesTab)}
                      className={`text-xs md:text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        issuesTab === tab.id
                          ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                          : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.08]'
                      }`}
                    >
                          {tab.label} {tab.count > 0 && <span className="text-xs ml-1">({tab.count})</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 md:px-5 py-4">
                {issuesTab === 'objects' && (
                  <div className="space-y-2">
                    {analytics.topLowestObjects.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada data</p>
                    ) : (
                      analytics.topLowestObjects.map((obj) => (
                        <div key={`${obj.periodId}:${obj.objectId}`} className="bg-[#0f1117] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.12] transition-colors">
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white break-words">{obj.objectName}</p>
                              <div className="flex gap-3 mt-2 text-xs text-white/40">
                                <span className="inline-flex items-center gap-1">
                                  👤 {obj.gaName}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  📋 {obj.submissionCount} evaluasi
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  🗓 {obj.periodLabel}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xl font-bold text-red-400">{obj.avgScore.toFixed(1)}</span>
                              <span className="text-xs text-white/40">rata-rata</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {issuesTab === 'questions' && (
                  <div className="space-y-4">
                    {analytics.topLowestQuestions.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada data</p>
                    ) : (
                      analytics.topLowestQuestions.map((item) => (
                        <div key={item.objectId} className="space-y-3">
                          {/* Object header */}
                          <button
                            onClick={() => setExpandedQuestionObjectId(expandedQuestionObjectId === item.objectId ? null : item.objectId)}
                            className="w-full px-3 py-2.5 bg-[#161b27]/50 border border-white/[0.06] rounded-lg text-left hover:border-white/[0.12] transition-colors"
                          >
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{item.objectName}</p>
                                <p className="text-white/30 text-xs mt-0.5">PIC: {item.gaName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/30 whitespace-nowrap">
                                  {item.questions.reduce((sum, q) => sum + q.responseCount, 0)} total respons
                                </span>
                                <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-1 shrink-0 whitespace-nowrap">
                                  {item.questions.length} pertanyaan rendah
                                </span>
                                <svg
                                  className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${expandedQuestionObjectId === item.objectId ? 'rotate-180' : ''}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </button>

                          {/* Questions list */}
                          {expandedQuestionObjectId === item.objectId && (
                            <div className="space-y-2 pl-2">
                              {item.questions.map((q) => (
                                <div key={q.groupKey} className="bg-[#0f1117] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.12] transition-colors">
                                  <div className="flex items-start gap-3 justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white break-words">{q.questionText}</p>
                                      <div className="flex gap-3 mt-2 text-xs text-white/40">
                                        <span className="inline-flex items-center gap-1">
                                          📊 {CAT_SHORT[q.category as keyof typeof CAT_SHORT] || q.category}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          💬 {q.responseCount} respon
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          🗓 {q.periodLabel}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      <span className="text-xl font-bold text-red-400">{q.score}/5</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {issuesTab === 'feedback' && (
                  <div className="space-y-2">
                    {analytics.criticalFeedback.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada feedback kritis</p>
                    ) : (
                      analytics.criticalFeedback.map((fb) => (
                        <div key={fb.scoreId} className="bg-[#0f1117] border border-red-500/20 rounded-lg p-3 hover:border-red-500/40 transition-colors">
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white break-words">{fb.questionText}</p>
                              <div className="flex gap-3 mt-2 text-xs text-white/40">
                                <span className="inline-flex items-center gap-1">
                                  📋 {fb.objectName}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  👤 {fb.gaName}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  🗓 {fb.periodLabel}
                                </span>
                              </div>
                              {fb.comment && (
                                <p className="text-xs text-white/60 italic mt-2 break-words">&quot;{fb.comment}&quot;</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xl font-bold text-red-400">{fb.score}/5</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
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
                {sortedGAScores.map((ga, idx) => {
                  const scoreThreshold = threshold ?? 60
                  const objectBelowCount = ga.objectScores.reduce((acc, obj) => {
                    const percent = toPercent(obj.scores.final)
                    return percent !== null && percent < scoreThreshold ? acc + 1 : acc
                  }, 0)

                  return (
                  <div key={ga.gaId}>
                    {/* GA row */}
                    <button
                      onClick={() => setExpanded(expanded === ga.gaId ? null : ga.gaId)}
                      className="w-full text-left px-4 md:px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Rank */}
                        {
                          (() => {
                            const hasScore = ga.finalScore !== null
                            const rankNum = hasScore ? idx + 1 : null
                            const rankClass = hasScore ? 'text-white' : 'text-white/20'

                            return (
                              <span className={`text-sm font-semibold w-5 text-center tabular-nums shrink-0 ${rankClass}`}>
                                {rankNum ?? '—'}
                              </span>
                            )
                          })()
                        }

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
                            {objectBelowCount > 0 && (
                              <span className="text-red-400"> · {objectBelowCount} objek di bawah threshold</span>
                            )}
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
                      <div className="bg-[#0f1117] px-4 md:px-5 py-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ga.objectScores.map(obj => (
                          (() => {
                            const percent = toPercent(obj.scores.final)
                            const scoreThreshold = threshold ?? 60
                            const isBelow = percent !== null ? percent < scoreThreshold : false

                            return (
                              <div key={obj.objectId} className="rounded-lg border border-white/[0.06] bg-[#161b27] p-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{obj.objectName}</p>
                                  <p className="text-xs text-white/30 mt-0.5 truncate">
                                    {obj.objectType} · {obj.submissionCount} evaluasi
                                  </p>
                                </div>
                                <div className="mt-2">
                                  <ScoreBar
                                    value={percent}
                                    isBelow={isBelow}
                                  />
                                </div>
                              </div>
                            )
                          })()
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>
      </main>
    </div>
  )
}