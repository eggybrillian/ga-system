'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ObjectItem = {
  id:     string
  name:   string
  type:   'mess' | 'office' | 'vehicle' | 'meeting_room'
  picGa:  { name: string } | null
  status: 'pending' | 'draft' | 'submitted' | 'no_period'
  formId: string | null
}

type Period = {
  id:      string
  label:   string
  endDate: string
}

const TYPE_LABEL: Record<string, string> = {
  mess:         'Mess',
  office:       'Kantor',
  vehicle:      'Kendaraan',
  meeting_room: 'Ruang Meeting',
}

const TYPE_ICON: Record<string, string> = {
  mess:         '🏠',
  office:       '🏢',
  vehicle:      '🚐',
  meeting_room: '📋',
}

const STATUS_CONFIG = {
  pending:   { label: 'Belum Dinilai', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  draft:     { label: 'Draft',         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  submitted: { label: 'Selesai',       color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  no_period: { label: 'Tidak Aktif',   color: 'text-white/30',   bg: 'bg-white/5 border-white/10' },
}

export default function EvaluatePage() {
  const router = useRouter()
  const [period, setPeriod]   = useState<Period | null>(null)
  const [items, setItems]     = useState<ObjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    fetch('/api/objects')
      .then(r => r.json())
      .then(data => {
        setPeriod(data.period)
        setItems(data.objects)
      })
      .finally(() => setLoading(false))

    // Ambil nama dari cookie/session via endpoint sederhana
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUserName(d.name ?? ''))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const pending   = items.filter(i => i.status === 'pending').length
  const submitted = items.filter(i => i.status === 'submitted').length
  const total     = items.length

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-white/80">Evaluasi GA</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Greeting */}
        <div>
          <p className="text-white/40 text-sm">Halo, {userName || '—'}</p>
          <h1 className="text-xl font-semibold mt-0.5">Form Evaluasi</h1>
        </div>

        {/* Period banner */}
        {period ? (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Periode Aktif</p>
              <p className="text-white font-medium mt-0.5">{period.label}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">Tutup</p>
              <p className="text-white/70 text-sm mt-0.5">
                {new Date(period.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
            Tidak ada periode evaluasi yang aktif saat ini.
          </div>
        )}

        {/* Progress */}
        {total > 0 && period && (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm">Progress kamu</p>
              <p className="text-white text-sm font-medium">{submitted}/{total} selesai</p>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3b82f6] rounded-full transition-all"
                style={{ width: `${(submitted / total) * 100}%` }}
              />
            </div>
            {pending > 0 && (
              <p className="text-white/30 text-xs mt-2">{pending} objek belum dinilai</p>
            )}
          </div>
        )}

        {/* Object list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#161b27] border border-white/[0.08] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-8 text-center text-white/30 text-sm">
            Tidak ada objek yang perlu dievaluasi.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map(item => {
              const cfg       = STATUS_CONFIG[item.status]
              const canFill   = item.status !== 'submitted' && item.status !== 'no_period' && !!period

              return (
                <button
                  key={item.id}
                  onClick={() => canFill && router.push(`/evaluate/${item.id}`)}
                  disabled={!canFill}
                  className={`w-full text-left bg-[#161b27] border border-white/[0.08] rounded-xl p-4
                    flex items-center gap-4 transition-all
                    ${canFill
                      ? 'hover:border-white/20 hover:bg-[#1c2333] cursor-pointer'
                      : 'opacity-60 cursor-default'
                    }`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-xl shrink-0">
                    {TYPE_ICON[item.type]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{item.name}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {TYPE_LABEL[item.type]}
                      {item.picGa && ` · PIC: ${item.picGa.name}`}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`shrink-0 text-xs border rounded-full px-2.5 py-1 ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}