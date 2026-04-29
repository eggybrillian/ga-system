'use client'

import { useEffect, useState } from 'react'

type Question = {
  id:         string
  objectType: 'mess' | 'office' | 'vehicle' | 'meeting_room'
  category:   'facility_quality' | 'service_performance' | 'user_satisfaction'
  text:       string
  weight:     string
  isActive:   boolean
  sortOrder:  number
}

type ModalMode = 'create' | 'edit' | null

const OBJ_TYPES = [
  { value: 'mess',         label: 'Mess' },
  { value: 'office',       label: 'Kantor' },
  { value: 'vehicle',      label: 'Kendaraan' },
  { value: 'meeting_room', label: 'Ruang Meeting' },
] as const

const CATEGORIES = [
  { value: 'facility_quality',     label: 'Kualitas Fasilitas' },
  { value: 'service_performance',  label: 'Kinerja Layanan' },
  { value: 'user_satisfaction',    label: 'Kepuasan Pengguna' },
] as const

const OBJ_LABEL: Record<string, string> = Object.fromEntries(OBJ_TYPES.map(o => [o.value, o.label]))
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

type FormState = {
  objectType: string
  category:   string
  text:       string
  weight:     string
  sortOrder:  string
}
const EMPTY: FormState = { objectType: 'mess', category: 'facility_quality', text: '', weight: '1.00', sortOrder: '0' }

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<string>('all')
  const [modal, setModal]         = useState<ModalMode>(null)
  const [editing, setEditing]     = useState<Question | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/questions').then(r => r.json()).then(setQuestions).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null); setForm(EMPTY); setError(''); setModal('create')
  }

  function openEdit(q: Question) {
    setEditing(q)
    setForm({
      objectType: q.objectType,
      category:   q.category,
      text:       q.text,
      weight:     q.weight,
      sortOrder:  String(q.sortOrder),
    })
    setError(''); setModal('edit')
  }

  async function handleSave() {
    if (!form.text.trim()) { setError('Teks pertanyaan wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const url    = modal === 'edit' ? `/api/admin/questions/${editing!.id}` : '/api/admin/questions'
      const method = modal === 'edit' ? 'PATCH' : 'POST'
      const payload = {
        objectType: form.objectType,
        category:   form.category,
        text:       form.text,
        weight:     form.weight,
        sortOrder:  parseInt(form.sortOrder) || 0,
      }
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null); load()
    } finally { setSaving(false) }
  }

  async function toggleActive(q: Question) {
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !q.isActive }),
    })
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleteError('')
    const res  = await fetch(`/api/admin/questions/${deleteId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error); return }
    setDeleteId(null); load()
  }

  const filtered = filter === 'all' ? questions : questions.filter(q => q.objectType === filter)

  // Group by objectType → category
  const grouped: Record<string, Record<string, Question[]>> = {}
  for (const q of filtered) {
    if (!grouped[q.objectType]) grouped[q.objectType] = {}
    if (!grouped[q.objectType][q.category]) grouped[q.objectType][q.category] = []
    grouped[q.objectType][q.category].push(q)
  }

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-semibold">Kelola Pertanyaan</h1>
            <p className="text-white/30 text-sm mt-0.5">
              Susun bank pertanyaan per tipe objek dan kategori penilaian
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Tambah Pertanyaan</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilter('all')}
            className={`text-sm px-3.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap
              ${filter === 'all'
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}>
            Semua
          </button>
          {OBJ_TYPES.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className={`text-sm px-3.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap
                ${filter === t.value
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Question List */}
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-[#161b27] border border-white/[0.08] rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-10 text-center text-white/30 text-sm">
            {filter === 'all' ? 'Belum ada pertanyaan. Buat pertanyaan pertama sekarang.' : 'Tidak ada pertanyaan untuk tipe objek ini.'}
          </div>
        ) : Object.entries(grouped).map(([objType, categories]) => (
          <section key={objType} className="space-y-4">
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {OBJ_LABEL[objType] ?? objType}
            </h2>

            {Object.entries(categories).map(([cat, qs]) => (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs text-white/30 uppercase tracking-wider ml-1">{CAT_LABEL[cat] ?? cat}</h3>
                {qs.map(q => (
                  <div key={q.id} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4 md:p-5 flex items-start gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className={`font-medium text-sm ${q.isActive ? '' : 'text-white/30 line-through'}`}>{q.text}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/30">
                        <span>Bobot: {q.weight}</span>
                        <span>·</span>
                        <span>Urutan: {q.sortOrder}</span>
                        <span className={`border rounded-full px-2 py-0.5 ${q.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-white/30'
                        }`}>
                          {q.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleActive(q)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                          ${q.isActive
                            ? 'border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                        {q.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={() => openEdit(q)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => { setDeleteId(q.id); setDeleteError('') }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </main>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 space-y-5">
            <h2 className="font-semibold">{modal === 'create' ? 'Tambah Pertanyaan' : 'Edit Pertanyaan'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Tipe Objek</label>
                  <select value={form.objectType} onChange={e => setForm(f => ({ ...f, objectType: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    {OBJ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Pertanyaan</label>
                <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  rows={3} placeholder="Tulis pertanyaan evaluasi..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Bobot</label>
                  <input type="number" step="0.01" min="0" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Urutan</label>
                  <input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setError('') }}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Hapus Pertanyaan?</h3>
              <p className="text-white/40 text-sm mt-1">Pertanyaan yang sudah memiliki data evaluasi tidak dapat dihapus.</p>
            </div>
            {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors">Batal</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500/80 hover:bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
