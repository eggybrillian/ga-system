'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import PeriodSelector from '../../../../components/admin/PeriodSelector'
import ScoreBar from '../../../../components/admin/ScoreBar'

type Period = {
  id: string
  label: string
  startDate: string
  endDate: string
}

type ObjectScore = {
  objectId: string
  objectName: string
  objectType: string
  submissionCount: number
  scores: {
    facility_quality: number | null
    service_performance: number | null
    user_satisfaction: number | null
    final: number | null
  }
}

function toPercent(score: number | null) {
  return score === null ? null : (score / 5) * 100
}

type GAStaffItem = {
  id: string
  name: string
  nik: string
  managedObjects: number
  finalScore: number | null
  isBelow: boolean
  objectScores: ObjectScore[]
}

export default function AdminReportsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([])
  const [gaStaff, setGAStaff] = useState<GAStaffItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedPeriods = useMemo(
    () => periods.filter((item) => selectedPeriodIds.includes(item.id)),
    [periods, selectedPeriodIds]
  )

  async function loadPeriods() {
    try {
      const res = await fetch('/api/admin/periods')
      if (!res.ok) return
      const rows = await res.json()
      setPeriods(rows || [])
      if (rows?.length && selectedPeriodIds.length === 0) {
        const latest = [...rows].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
        if (latest?.id) setSelectedPeriodIds([latest.id])
      }
    } catch {
      // ignore
    }
  }

  async function fetchGAStaff(periodIds?: string[]) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      const ids = periodIds ?? selectedPeriodIds
      ids.forEach((id) => params.append('periodId', id))

      const res = await fetch(`/api/admin/ga-staff?${params.toString()}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal memuat GA staff')
      const json = await res.json()

      setGAStaff(json.gaStaff ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriodIds.length > 0) fetchGAStaff(selectedPeriodIds)
  }, [selectedPeriodIds])

  const stats = useMemo(() => {
    const scored = gaStaff.filter((ga) => ga.finalScore !== null)
    return {
      total: gaStaff.length,
      scored: scored.length,
      below: scored.filter((ga) => ga.isBelow).length,
    }
  }, [gaStaff])

  async function handleExport() {
    if (selectedPeriodIds.length === 0) {
      setError('Pilih periode dulu')
      return
    }

    setExporting('excel')
    setError(null)
    try {
      const res = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodIds: selectedPeriodIds,
          format: 'excel',
        }),
      })

      if (!res.ok) throw new Error((await res.json()).error || 'Gagal export')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ga-report.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <PageHeader
          title="Laporan"
          subtitle={
            selectedPeriodIds.length === 0
              ? 'Tidak ada periode aktif'
              : selectedPeriodIds.length === 1
                ? (selectedPeriods[0] ? `Periode: ${selectedPeriods[0].label}` : 'Memuat...')
                : `Periode: ${selectedPeriodIds.length} terpilih`
          }
        />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-white/40 text-xs mb-2">Pilih Periode</label>
            <PeriodSelector
              periods={periods}
              selected={selectedPeriodIds}
              onChange={setSelectedPeriodIds}
            />
          </div>

          <p className="text-white/20 text-xs leading-relaxed">
            Gunakan pemilih periode untuk melihat satu atau beberapa periode sekaligus.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm hover:bg-white/[0.07]"
            onClick={() => fetchGAStaff(selectedPeriodIds)}
            disabled={loading}
          >
            {loading ? 'Memuat...' : 'Muat Data'}
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-50"
            onClick={handleExport}
            disabled={selectedPeriodIds.length === 0 || exporting !== null}
          >
            {exporting === 'excel' ? 'Export Excel...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs mb-1">Total GA Staff</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs mb-1">Memiliki Skor</p>
          <p className="text-2xl font-semibold text-emerald-400">{stats.scored}</p>
        </div>
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
          <p className="text-white/40 text-xs mb-1">Di Bawah Threshold</p>
          <p className="text-2xl font-semibold text-red-400">{stats.below}</p>
        </div>
      </div>

      <div className="bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="font-medium text-sm">Ringkasan GA Staff</h2>
        </div>

        {selectedPeriodIds.length === 0 ? (
          <div className="p-6 text-sm text-white/30">Pilih periode untuk melihat hasil evaluasi.</div>
        ) : gaStaff.length === 0 ? (
          <div className="p-6 text-sm text-white/30">Belum ada data yang sesuai dengan filter.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {gaStaff.map((ga) => (
              <div key={ga.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{ga.name}</p>
                    <p className="text-white/30 text-xs">{ga.nik} · {ga.managedObjects} objek</p>
                  </div>
                  <div className={`text-sm font-semibold ${ga.isBelow ? 'text-red-400' : 'text-emerald-400'}`}>
                    {ga.finalScore !== null ? ga.finalScore.toFixed(1) : '—'}
                  </div>
                </div>
                <ScoreBar value={ga.finalScore} isBelow={ga.isBelow} />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ga.objectScores.map((obj) => (
                    <div key={obj.objectId} className="rounded-lg border border-white/[0.06] bg-[#0f1117] p-3">
                      <div className="text-sm font-medium truncate">{obj.objectName}</div>
                      <div className="text-xs text-white/30 mt-0.5">{obj.objectType} · {obj.submissionCount} evaluasi</div>
                      <div className="mt-2">
                        <ScoreBar
                          value={toPercent(obj.scores.final)}
                          isBelow={(toPercent(obj.scores.final) ?? 0) < 60}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
