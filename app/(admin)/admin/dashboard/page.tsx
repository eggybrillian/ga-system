'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import ActionButton from '@/components/admin/ActionButton'
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

const TYPE_ICON: Record<string, string> = {
  mess: '🏠', office: '🏢', vehicle: '🚐', meeting_room: '📋',
}

const CAT_SHORT: Record<string, string> = {
  facility_quality:    'Fasilitas',
  service_performance: 'Layanan',
  user_satisfaction:   'Kepuasan',
}

// default shown until settings are loaded
// threshold will be loaded from settings table via API
// (initial default kept for SSR/client hydration safety)
// const THRESHOLD = 60



// ── Main Page ──────────────────────────────────────────────────────────────

type AnalyticsData = {
  topLowestObjects: Array<{
    objectId: string
    objectName: string
    objectType: string
    gaName: string
    avgScore: number
    submissionCount: number
  }>
  topLowestQuestions: Array<{
    questionId: string
    questionText: string
    category: string
    avgScore: number
    responseCount: number
  }>
  criticalFeedback: Array<{
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
  const [gaScores, setGAScores]       = useState<GAScore[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [analytics, setAnalytics]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [issuesTab, setIssuesTab]     = useState<'objects' | 'questions' | 'feedback'>('objects')
  const [threshold, setThreshold]     = useState<number>(60)

  function fetchData() {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/scores').then(r => r.json()),
      fetch('/api/admin/dashboard-analytics').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json()),
    ])
      .then(([scoresData, analyticsData, settingsData]) => {
        setPeriod(scoresData.period)
        setGAScores(scoresData.gaScores ?? [])
        setStats(scoresData.stats)
        setAnalytics(analyticsData)
        if (settingsData && typeof settingsData.threshold === 'number') {
          setThreshold(settingsData.threshold)
        } else if (settingsData && settingsData.threshold) {
          const parsed = parseFloat(String(settingsData.threshold))
          if (!Number.isNaN(parsed)) setThreshold(parsed)
        }
      })
      .catch(err => console.error('Error fetching data:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
          {/* Page header */}
          <PageHeader
            title="Dashboard"
            subtitle={period ? `Periode: ${period.label}` : 'Tidak ada periode aktif'}
            actions={<ActionButton onClick={fetchData} loading={loading}><span className="hidden sm:inline">Refresh</span></ActionButton>}
          />

          {/* Stats — 2 col mobile, 4 col desktop */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Submission',        value: stats.totalSubmissions, sub: `dari ${stats.totalAssignments} penugasan`, color: 'text-blue-400' },
                { label: 'GA Dinilai',        value: `${stats.gaScored}/${stats.gaTotal}`, sub: 'memiliki data skor', color: 'text-white' },
                { label: 'Di Bawah Threshold',value: stats.gaBelow, sub: `min. ${threshold}%`, color: stats.gaBelow > 0 ? 'text-red-400' : 'text-emerald-400' },
                { label: 'Threshold',         value: `${threshold}%`, sub: 'batas minimum', color: 'text-white/60' },
              ].map(card => (
                <div key={card.label} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-1 truncate">{card.label}</p>
                  <p className={`text-xl md:text-2xl font-semibold ${card.color}`}>{card.value}</p>
                  <p className="text-white/20 text-xs mt-1 truncate">{card.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Category Performance Trend */}
          {analytics && Object.keys(analytics.categoryAverages).length > 0 && (
            <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="px-4 md:px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-medium text-sm">Performa Kategori</h2>
              </div>
              <div className="px-4 md:px-5 py-4 space-y-3">
                {Object.entries(analytics.categoryAverages).map(([cat, score]) => {
                  const catLabel = CAT_SHORT[cat as keyof typeof CAT_SHORT] || cat
                  const color = score < threshold ? 'bg-red-500' : score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-white/60 text-xs font-medium w-24 md:w-28 shrink-0">{catLabel}</span>
                      <div className="flex-1">
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white w-10 text-right shrink-0">{score.toFixed(1)}</span>
                    </div>
                  )
                })}
              </div>
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
                  <div className="space-y-3">
                    {analytics.topLowestObjects.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada data</p>
                    ) : (
                      analytics.topLowestObjects.map((obj, idx) => (
                        <div key={obj.objectId} className="bg-[#0f1117] border border-white/[0.06] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{TYPE_ICON[obj.objectType]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{obj.objectName}</p>
                              <p className="text-white/40 text-xs truncate">PIC: {obj.gaName}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              obj.avgScore < threshold ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {obj.avgScore.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-white/40 text-xs">{obj.submissionCount} evaluasi</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {issuesTab === 'questions' && (
                  <div className="space-y-3">
                    {analytics.topLowestQuestions.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada data</p>
                    ) : (
                      analytics.topLowestQuestions.map((q) => (
                        <div key={q.questionId} className="bg-[#0f1117] border border-white/[0.06] rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white break-words">{q.questionText}</p>
                              <p className="text-white/40 text-xs mt-1">
                                {CAT_SHORT[q.category as keyof typeof CAT_SHORT] || q.category} • {q.responseCount} respon
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded shrink-0 ${
                              q.avgScore < threshold ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {q.avgScore.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {issuesTab === 'feedback' && (
                  <div className="space-y-3">
                    {analytics.criticalFeedback.length === 0 ? (
                      <p className="text-white/30 text-sm">Tidak ada feedback kritis</p>
                    ) : (
                      analytics.criticalFeedback.map((fb, idx) => (
                        <div key={idx} className="bg-[#0f1117] border border-red-500/20 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-red-400 font-semibold mb-1">
                                ⚠ Skor {fb.score}/5 • {fb.objectName}
                              </p>
                              <p className="text-white/60 text-xs mb-1">{fb.questionText}</p>
                              {fb.comment && (
                                <p className="text-sm text-white/80 italic break-words">"{fb.comment}"</p>
                              )}
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
      </main>
    </div>
  )
}