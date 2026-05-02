'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────

type AdminFlag = {
  id:          string
  nik:         string
  employeeName: string
  role:        'admin' | 'superadmin'
  grantedBy:   string | null
  grantedAt:   string
  isActive:    boolean
  userType:    'user' | 'ga_staff' | 'unknown'
  email:       string | null
  department:  string | null
}

type FormData = {
  nik:          string
  employeeName: string
  role:         'admin' | 'superadmin'
}

type ConfirmModal = {
  type: 'toggle' | 'delete'
  flag: AdminFlag | null
  isOpen: boolean
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminAccessPage() {
  const router = useRouter()
  const [flags, setFlags] = useState<AdminFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
    type: 'toggle',
    flag: null,
    isOpen: false,
  })
  const [formData, setFormData] = useState<FormData>({
    nik: '',
    employeeName: '',
    role: 'admin',
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Check authorization
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(session => {
        if (session?.role !== 'superadmin') {
          setAuthorized(false)
          router.push('/admin/dashboard')
        } else {
          setAuthorized(true)
          fetchFlags()
        }
      })
      .catch(() => {
        setAuthorized(false)
        router.push('/admin/dashboard')
      })
  }, [])

  function fetchFlags() {
    setLoading(true)
    
    fetch('/api/admin/admin-access')
      .then(r => r.json())
      .then(d => {
        setFlags(d.flags || [])
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  function handleOpenModal() {
    setShowModal(true)
    setFormError(null)
    setFormData({ nik: '', employeeName: '', role: 'admin' })
  }

  function handleCloseModal() {
    setShowModal(false)
    setFormError(null)
    setFormData({ nik: '', employeeName: '', role: 'admin' })
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    if (!formData.nik.trim()) {
      setFormError('NIK harus diisi')
      setIsSubmitting(false)
      return
    }

    if (!formData.employeeName.trim()) {
      setFormError('Nama harus diisi')
      setIsSubmitting(false)
      return
    }

    fetch('/api/admin/admin-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(r => {
        if (!r.ok) return r.json().then(d => Promise.reject(d))
        return r.json()
      })
      .then(() => {
        handleCloseModal()
        fetchFlags()
      })
      .catch(err => {
        console.error(err)
        setFormError(err.error || 'Gagal menambah admin flag')
      })
      .finally(() => setIsSubmitting(false))
  }

  function handleToggleStatus(flag: AdminFlag) {
    setConfirmModal({
      type: 'toggle',
      flag,
      isOpen: true,
    })
  }

  async function confirmToggleStatus() {
    if (!confirmModal.flag) return
    const flag = confirmModal.flag
    
    setConfirmModal({ type: 'toggle', flag: null, isOpen: false })

    fetch('/api/admin/admin-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: flag.id,
        isActive: !flag.isActive,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error('Gagal update status')
        return r.json()
      })
      .then(() => fetchFlags())
      .catch(err => {
        console.error(err)
        alert('Gagal mengubah status admin')
      })
  }

  function handleDelete(flag: AdminFlag) {
    setConfirmModal({
      type: 'delete',
      flag,
      isOpen: true,
    })
  }

  async function confirmDelete() {
    if (!confirmModal.flag) return
    const flag = confirmModal.flag
    
    setConfirmModal({ type: 'delete', flag: null, isOpen: false })

    fetch(`/api/admin/admin-access?id=${flag.id}`, {
      method: 'DELETE',
    })
      .then(r => {
        if (!r.ok) throw new Error('Gagal hapus')
        return r.json()
      })
      .then(() => fetchFlags())
      .catch(err => {
        console.error(err)
        alert('Gagal menghapus admin flag')
      })
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    admin: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Admin' },
    superadmin: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Superadmin' },
  }

  if (!authorized) {
    return (
      <div className="space-y-6">
        <main className="max-w-5xl mx-auto px-4 md:px-2 py-4">
          <div className="bg-[#161b27] border border-red-500/30 rounded-lg p-8 text-center">
            <p className="text-red-400 text-sm">⛔ Anda tidak memiliki akses ke halaman ini. Hanya superadmin yang diizinkan.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <PageHeader
          title="Hak Akses Admin"
          subtitle="Kelola privilege admin dan superadmin (hanya untuk superadmin)"
          actions={(
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Tambah Admin</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          )}
        />

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-[#161b27] border border-white/[0.08] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Admin Flags List */}
        {!loading && flags.length > 0 && (
          <div className="space-y-3">
            {flags.map((flag) => {
              const roleStyle = roleColors[flag.role]
              return (
                <div
                  key={flag.id}
                  className="bg-[#161b27] border border-white/[0.08] rounded-lg p-4 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-white">{flag.employeeName}</h3>
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 shrink-0 ${roleStyle.bg} border-current ${roleStyle.text}`}>
                          {roleStyle.label}
                        </span>
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 shrink-0 ${flag.isActive ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/30 bg-white/5'}`}>
                          {flag.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white/40 mt-2">
                        <div>
                          <div className="text-white/20">NIK</div>
                          <div className="font-mono text-white">{flag.nik}</div>
                        </div>
                        <div>
                          <div className="text-white/20">Tipe</div>
                          <div className="text-white">{flag.userType === 'ga_staff' ? 'GA Staff' : 'User'}</div>
                        </div>
                        {flag.email && (
                          <div>
                            <div className="text-white/20">Email</div>
                            <div className="text-white truncate">{flag.email}</div>
                          </div>
                        )}
                        {flag.department && (
                          <div>
                            <div className="text-white/20">Dept/Posisi</div>
                            <div className="text-white truncate">{flag.department}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-white/30 flex flex-wrap items-center gap-2">
                        {flag.grantedBy && <span>Oleh: {flag.grantedBy}</span>}
                        <span className="text-white/20">•</span>
                        <span>{formatDate(flag.grantedAt)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(flag)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          flag.isActive
                            ? 'border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}>
                        {flag.isActive ? '⊘ Nonaktifkan' : '✓ Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(flag)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && flags.length === 0 && (
          <div className="bg-[#161b27] border border-white/[0.08] rounded-lg p-12 text-center">
            <p className="text-white/30 text-sm mb-2">Belum ada admin flag</p>
            <p className="text-white/20 text-xs">Klik tombol "Tambah Admin" untuk menambahkan admin</p>
          </div>
        )}
      </main>

      {/* Modal - Tambah Admin */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-[#1a1f2e] border border-white/[0.08] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Tambah Admin</h2>

            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3">
              {/* NIK */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  NIK *
                </label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) =>
                    setFormData({ ...formData, nik: e.target.value })
                  }
                  placeholder="Contoh: A001"
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:border-[#3b82f6] focus:outline-none transition-colors"
                />
              </div>

              {/* Nama */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Nama *
                </label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeName: e.target.value })
                  }
                  placeholder="Nama lengkap"
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:border-[#3b82f6] focus:outline-none transition-colors"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'superadmin',
                    })
                  }
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#3b82f6] focus:outline-none transition-colors">
                  <option value="admin">🔐 Admin</option>
                  <option value="superadmin">👑 Superadmin</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium py-2 disabled:opacity-50 transition-colors">
                  {isSubmitting ? '⏳ Menyimpan...' : '✓ Simpan'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.04] text-sm font-medium py-2 disabled:opacity-50 transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Toggle Status */}
      {confirmModal.isOpen && confirmModal.type === 'toggle' && confirmModal.flag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-[#1a1f2e] border border-white/[0.08] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {confirmModal.flag.isActive ? '⊘ Nonaktifkan' : '✓ Aktifkan'} Admin?
            </h2>
            <p className="text-white/60 text-sm">
              Anda akan {confirmModal.flag.isActive ? 'menonaktifkan' : 'mengaktifkan'} akses admin untuk <span className="font-semibold text-white">{confirmModal.flag.employeeName}</span>. Lanjutkan?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmToggleStatus}
                className="flex-1 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium py-2 transition-colors">
                Ya, {confirmModal.flag.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button
                onClick={() => setConfirmModal({ type: 'toggle', flag: null, isOpen: false })}
                className="flex-1 rounded-lg border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.04] text-sm font-medium py-2 transition-colors">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Delete */}
      {confirmModal.isOpen && confirmModal.type === 'delete' && confirmModal.flag && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">🗑️ Hapus Admin?</h2>
            <p className="text-white/60 text-sm">
              Akses admin untuk <span className="font-semibold text-white">{confirmModal.flag.employeeName}</span> akan dihapus. <span className="text-red-400 font-semibold">Tindakan ini tidak bisa dibatalkan.</span>
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ type: 'delete', flag: null, isOpen: false })}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors">
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
