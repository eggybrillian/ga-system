'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'

type GAStaff = { id: string; name: string; nik: string }
type User    = { id: string; name: string; nik: string; department: string }

type ObjectItem = {
  id:     string
  name:   string
  type:   'mess' | 'office' | 'vehicle' | 'meeting_room'
  picGa:  GAStaff | null
  userAssignments: { user: User }[]
}

type ModalMode = 'create' | 'edit' | 'assign-users' | null

const TYPE_LABEL: Record<string, string> = {
  mess: 'Mess', office: 'Kantor', vehicle: 'Kendaraan', meeting_room: 'Ruang Meeting',
}
const TYPE_ICON: Record<string, string> = {
  mess: '🏠', office: '🏢', vehicle: '🚐', meeting_room: '📋',
}

type ObjForm = { name: string; type: string; picGaId: string }
const EMPTY_FORM: ObjForm = { name: '', type: 'office', picGaId: '' }

export default function AdminObjectsPage() {
  const [items, setItems]       = useState<ObjectItem[]>([])
  const [gaList, setGAList]     = useState<GAStaff[]>([])
  const [userList, setUserList] = useState<User[]>([])
  const [loading, setLoading]   = useState(true)

  const [modal, setModal]             = useState<ModalMode>(null)
  const [editing, setEditing]         = useState<ObjectItem | null>(null)
  const [form, setForm]               = useState<ObjForm>(EMPTY_FORM)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userSearch, setUserSearch]   = useState('')

  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function loadAll() {
    setLoading(true)
    const [objRes, memRes] = await Promise.all([
      fetch('/api/admin/objects').then(r => r.json()),
      fetch('/api/admin/members').then(r => r.json()),
    ])
    setItems(Array.isArray(objRes) ? objRes : [])
    setGAList(memRes.gaStaff ?? [])
    setUserList(memRes.users ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setError(''); setModal('create') }
  function openEdit(obj: ObjectItem) {
    setEditing(obj); setForm({ name: obj.name, type: obj.type, picGaId: obj.picGa?.id ?? '' })
    setError(''); setModal('edit')
  }
  function openAssignUsers(obj: ObjectItem) {
    setEditing(obj); setSelectedUsers(obj.userAssignments.map(a => a.user.id))
    setUserSearch(''); setError(''); setModal('assign-users')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const url    = modal === 'edit' ? `/api/admin/objects/${editing!.id}` : '/api/admin/objects'
      const method = modal === 'edit' ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null); loadAll()
    } finally { setSaving(false) }
  }

  async function handleAssignUsers() {
    if (!editing) return
    setSaving(true); setError('')
    try {
      const res  = await fetch(`/api/admin/objects/${editing.id}/assign-users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null); loadAll()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleteError('')
    const res  = await fetch(`/api/admin/objects/${deleteId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error); return }
    setDeleteId(null); loadAll()
  }

  function toggleUser(id: string) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id])
  }

  const filteredUsers = userList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.nik.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.department ?? '').toLowerCase().includes(userSearch.toLowerCase())
  )

  const grouped = ['mess','office','vehicle','meeting_room'].reduce((acc, type) => {
    const g = items.filter(i => i.type === type)
    if (g.length) acc[type] = g
    return acc
  }, {} as Record<string, ObjectItem[]>)

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <PageHeader
          title="Kelola Objek"
          subtitle="Atur fasilitas, PIC GA, dan daftar user penilai untuk setiap objek"
          actions={(
            <button onClick={openCreate} className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">Tambah Objek</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          )}
        />
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-[#161b27] border border-white/[0.08] rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-10 text-center text-white/30 text-sm">Belum ada objek. Tambahkan objek pertama sekarang.</div>
        ) : Object.entries(grouped).map(([type, group]) => (
          <div key={type}>
            <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">{TYPE_ICON[type]} {TYPE_LABEL[type]}</h2>
            <div className="space-y-2.5">
              {group.map(obj => (
                <div key={obj.id} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-4 md:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{obj.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                        <span>PIC: <span className={obj.picGa ? 'text-white/60' : 'text-amber-400'}>{obj.picGa?.name ?? '⚠ Belum di-assign'}</span></span>
                        <span>{obj.userAssignments.length > 0 ? `${obj.userAssignments.length} penilai` : <span className="text-amber-400">⚠ Belum ada penilai</span>}</span>
                      </div>
                      {obj.userAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {obj.userAssignments.slice(0,3).map(a => (
                            <span key={a.user.id} className="text-xs bg-white/[0.05] border border-white/[0.06] rounded-full px-2 py-0.5 text-white/40">{a.user.name}</span>
                          ))}
                          {obj.userAssignments.length > 3 && <span className="text-xs text-white/20 px-1 py-0.5">+{obj.userAssignments.length - 3} lainnya</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openAssignUsers(obj)} title="Assign Penilai" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                      <button onClick={() => openEdit(obj)} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => { setDeleteId(obj.id); setDeleteError('') }} title="Hapus" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 space-y-5">
            <h2 className="font-semibold">{modal === 'create' ? 'Tambah Objek' : 'Edit Objek'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Nama Objek</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Mess Block C"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">Tipe</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                  {Object.entries(TYPE_LABEL).map(([val, lbl]) => <option key={val} value={val}>{TYPE_ICON[val]} {lbl}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1.5">PIC GA Staff</label>
                <select value={form.picGaId} onChange={e => setForm(f => ({ ...f, picGaId: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                  <option value="">— Pilih GA Staff —</option>
                  {gaList.map(g => <option key={g.id} value={g.id}>{g.name} ({g.nik})</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setError('') }} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {modal === 'assign-users' && editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/[0.06] shrink-0">
              <h2 className="font-semibold">Assign Penilai</h2>
              <p className="text-white/40 text-sm mt-0.5">{editing.name}</p>
            </div>
            <div className="p-4 border-b border-white/[0.04] shrink-0">
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Cari nama, NIK, atau departemen..."
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />
              <p className="text-white/30 text-xs mt-2">{selectedUsers.length} dari {userList.length} user dipilih</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredUsers.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">Tidak ada user ditemukan</p>
              ) : filteredUsers.map(u => {
                const selected = selectedUsers.includes(u.id)
                return (
                  <button key={u.id} onClick={() => toggleUser(u.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${selected ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'}`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-white/20'}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{u.name}</p>
                      <p className="text-xs text-white/30 truncate">{u.nik} · {u.department}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="p-4 border-t border-white/[0.06] shrink-0">
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setModal(null); setError('') }} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors">Batal</button>
                <button onClick={handleAssignUsers} disabled={saving} className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Hapus Objek?</h3>
              <p className="text-white/40 text-sm mt-1">Objek yang memiliki data evaluasi akan di-nonaktifkan (soft delete), bukan dihapus permanen.</p>
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