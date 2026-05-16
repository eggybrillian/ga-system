'use client'

import { useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'

type Period = {
  id:        string
  label:     string
  type:      'monthly' | 'event_based'
  startDate: string
  endDate:   string
  status:    'open' | 'closed'
}

type ModalMode = 'create' | 'edit' | null

const STATUS = {
  open:   { label: 'Aktif',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  closed: { label: 'Selesai', color: 'text-white/30',    bg: 'bg-white/5 border-white/10' },
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toInputDate(date: string) {
  return new Date(date).toISOString().split('T')[0]
}

type FormState = { label: string; type: string; startDate: string; endDate: string }
const EMPTY: FormState = { label: '', type: '', startDate: '', endDate: '' }

export default function AdminPeriodsPage() {
  const [periods, setPeriods]   = useState<Period[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<ModalMode>(null)
  const [editing, setEditing]   = useState<Period | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const startDateRef = useRef<HTMLInputElement | null>(null)
  const endDateRef = useRef<HTMLInputElement | null>(null)

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return
    input.showPicker?.()
  }

  function load() {
    setLoading(true)
    fetch('/api/admin/periods').then(r => r.json()).then(setPeriods).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null); setForm(EMPTY); setError(''); setModal('create')
  }

  function openEdit(p: Period) {
    setEditing(p)
    setForm({ label: p.label, type: p.type, startDate: toInputDate(p.startDate), endDate: toInputDate(p.endDate) })
    setError(''); setModal('edit')
  }

  async function handleSave() {
    if (!form.label.trim()) { setError('Label harus diisi'); return }
    if (!form.type) { setError('Tipe harus dipilih'); return }
    if (!form.startDate) { setError('Tanggal mulai harus diisi'); return }
    if (!form.endDate) { setError('Tanggal selesai harus diisi'); return }
    setSaving(true); setError('')
    try {
      const url    = modal === 'edit' ? `/api/admin/periods/${editing!.id}` : '/api/admin/periods'
      const method = modal === 'edit' ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null); load()
    } catch {
      setError('Gagal menyimpan periode')
    } finally { setSaving(false) }
  }

  async function toggleStatus(p: Period) {
    await fetch(`/api/admin/periods/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: p.status === 'open' ? 'closed' : 'open' }),
    })
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleteError('')
    const res  = await fetch(`/api/admin/periods/${deleteId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error); return }
    setDeleteId(null); load()
  }

  return (
    <div className="space-y-6">
      <main className="max-w-7xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <PageHeader
          title="Kelola Periode"
          subtitle="Atur periode evaluasi yang sedang aktif maupun yang sudah selesai"
          actions={(
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Tambah Periode</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          )}
        />
        <div className="space-y-2">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-20 bg-[#161b27] border border-white/[0.08] rounded-lg animate-pulse" />)
        ) : periods.length === 0 ? (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-lg p-12 text-center text-white/30 text-sm">
            Belum ada periode. Buat periode pertama sekarang.
          </div>
        ) : periods.map(p => {
          const st = STATUS[p.status]
          return (
            <div key={p.id} className="w-full text-left bg-[#161b27] border border-white/[0.08] rounded-lg p-4 flex flex-col md:flex-row md:items-center items-center gap-3 md:gap-4 transition-colors hover:bg-white/[0.10] hover:text-white">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-medium text-white truncate">{p.label}</p>
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                  <span className="text-xs text-white/20 border border-white/[0.06] rounded-full px-2.5 py-0.5 shrink-0">
                    {p.type === 'monthly' ? 'Bulanan' : 'Event'}
                  </span>
                </div>
                <p className="text-white/40 text-xs">{fmt(p.startDate)} — {fmt(p.endDate)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleStatus(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                    ${p.status === 'open'
                      ? 'border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                  {p.status === 'open' ? 'Tutup' : 'Buka'}
                </button>
                <button onClick={() => openEdit(p)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => { setDeleteId(p.id); setDeleteError('') }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl w-full max-w-md p-6 space-y-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <h2 className="font-semibold text-sm">{modal === 'create' ? 'Tambah Periode' : 'Edit Periode'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Label</label>
                <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: Mei 2025"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Tipe</label>
                <div className="relative">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    onFocus={() => setActiveSelect('type')}
                    onMouseDown={() => setActiveSelect(prev => prev === 'type' ? null : 'type')}
                    onBlur={() => setActiveSelect(null)}
                    className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3.5 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-[#3b82f6] appearance-none">
                    <option value="" className="text-white/30">— Pilih Tipe —</option>
                    <option value="monthly">Bulanan</option>
                    <option value="event_based">Berbasis Event</option>
                  </select>
                  <div className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-white/30 transition-transform duration-150 ${activeSelect === 'type' ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Tanggal Mulai</label>
                  <input
                    ref={startDateRef}
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    onClick={() => openDatePicker(startDateRef.current)}
                    className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3b82f6] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Tanggal Selesai</label>
                  <input
                    ref={endDateRef}
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    onClick={() => openDatePicker(endDateRef.current)}
                    className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3b82f6] cursor-pointer"
                  />
                </div>
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => { setModal(null); setError('') }}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-lg py-2.5 text-sm transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl w-full max-w-sm p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <div>
              <h3 className="font-semibold text-sm">Hapus Periode?</h3>
              <p className="text-white/40 text-sm mt-1">Periode yang sudah memiliki data evaluasi tidak dapat dihapus.</p>
            </div>
            {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-lg py-2.5 text-sm transition-colors">Batal</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}