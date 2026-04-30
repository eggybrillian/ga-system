'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────

type SettingsForm = {
  threshold: string
  weight_facility_quality: string
  weight_service_performance: string
  weight_user_satisfaction: string
  odoo_ga_department_id: string
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    threshold: '60',
    weight_facility_quality: '0.35',
    weight_service_performance: '0.40',
    weight_user_satisfaction: '0.25',
    odoo_ga_department_id: '5',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load settings on mount
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setForm({
            threshold: data.threshold ?? '60',
            weight_facility_quality: data.weight_facility_quality ?? '0.35',
            weight_service_performance: data.weight_service_performance ?? '0.40',
            weight_user_satisfaction: data.weight_user_satisfaction ?? '0.25',
            odoo_ga_department_id: data.odoo_ga_department_id ?? '5',
          })
        }
      })
      .catch(err => {
        console.error('Error loading settings:', err)
        setError('Gagal memuat pengaturan')
      })
      .finally(() => setLoading(false))
  }, [])

  // Calculate weight sum
  const weightSum =
    (parseFloat(form.weight_facility_quality) || 0) +
    (parseFloat(form.weight_service_performance) || 0) +
    (parseFloat(form.weight_user_satisfaction) || 0)

  const isWeightValid = Math.abs(weightSum - 1.0) < 0.0001 // Allow for floating point errors

  // Handle field changes
  function handleChange(field: keyof SettingsForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  // Handle save
  async function handleSave() {
    // Validate threshold
    const threshold = parseFloat(form.threshold)
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      setError('Threshold harus antara 0 dan 100')
      return
    }

    // Validate weights
    if (!isWeightValid) {
      setError(`Bobot harus berjumlah 1.0 (saat ini: ${weightSum.toFixed(4)})`)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: parseFloat(form.threshold),
          weight_facility_quality: parseFloat(form.weight_facility_quality),
          weight_service_performance: parseFloat(form.weight_service_performance),
          weight_user_satisfaction: parseFloat(form.weight_user_satisfaction),
          odoo_ga_department_id: parseInt(form.odoo_ga_department_id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan')
      }

      setSuccess('Pengaturan berhasil disimpan')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/[0.03] rounded-lg w-32 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <main className="max-w-5xl mx-auto px-4 md:px-2 py-4 space-y-6">
      {/* Page header */}
      <PageHeader title="Pengaturan" subtitle="Konfigurasi sistem penilaian GA" />

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg p-4 text-sm flex items-start gap-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg p-4 text-sm flex items-start gap-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* Threshold section */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-5 md:p-6 space-y-4">
          <div>
            <h2 className="text-sm md:text-base font-semibold mb-1">Threshold Minimum</h2>
            <p className="text-white/40 text-xs md:text-sm">
              Skor minimum yang harus dicapai oleh GA staff (dalam persen)
            </p>
          </div>

          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">
              Threshold (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.threshold}
                onChange={(e) => handleChange('threshold', e.target.value)}
                className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
              />
              <span className="text-white/40 text-sm font-medium shrink-0">%</span>
            </div>
            <p className="text-white/30 text-xs mt-2">
              Nilai saat ini: <span className="font-semibold text-white">{form.threshold}%</span>
            </p>
          </div>
        </div>

        {/* Weights section */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-5 md:p-6 space-y-4">
          <div>
            <h2 className="text-sm md:text-base font-semibold mb-1">Bobot Kategori Penilaian</h2>
            <p className="text-white/40 text-xs md:text-sm">
              Tiga kategori dengan bobot total harus sama dengan 1.00
            </p>
          </div>

          <div className="space-y-3">
            {/* Facility Quality */}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">
                Kualitas Fasilitas
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.weight_facility_quality}
                onChange={(e) => handleChange('weight_facility_quality', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
              />
              <p className="text-white/30 text-xs mt-1">
                Kebersihan, ketersediaan utilitas, dan kondisi fasilitas
              </p>
            </div>

            {/* Service Performance */}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">
                Kinerja Layanan
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.weight_service_performance}
                onChange={(e) => handleChange('weight_service_performance', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
              />
              <p className="text-white/30 text-xs mt-1">
                Kecepatan respon, profesionalisme, dan ketersediaan layanan
              </p>
            </div>

            {/* User Satisfaction */}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">
                Kepuasan Pengguna
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.weight_user_satisfaction}
                onChange={(e) => handleChange('weight_user_satisfaction', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
              />
              <p className="text-white/30 text-xs mt-1">
                Tingkat kepuasan pengguna terhadap layanan dan fasilitas
              </p>
            </div>
          </div>

          {/* Weight validation */}
          <div className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-sm ${
            isWeightValid
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <svg className={`w-4 h-4 flex-shrink-0 ${isWeightValid ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isWeightValid
                ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                : 'M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              } />
            </svg>
            <span className={isWeightValid ? 'text-emerald-400' : 'text-red-400'}>
              Total bobot: <span className="font-semibold">{weightSum.toFixed(4)}</span>
              {isWeightValid ? ' ✓' : ' (harus 1.0000)'}
            </span>
          </div>
        </div>

        {/* Odoo config section */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-5 md:p-6 space-y-4">
          <div>
            <h2 className="text-sm md:text-base font-semibold mb-1">Konfigurasi Odoo</h2>
            <p className="text-white/40 text-xs md:text-sm">
              Pengaturan integrasi dengan sistem Odoo
            </p>
          </div>

          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">
              ID Departemen GA di Odoo
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.odoo_ga_department_id}
              onChange={(e) => handleChange('odoo_ga_department_id', e.target.value)}
              className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-white/20 text-sm md:text-base focus:outline-none focus:border-white/20 focus:bg-[#161b27] transition-colors"
            />
            <p className="text-white/30 text-xs mt-2">
              Gunakan ID ini untuk menyinkronkan data departemen GA dari Odoo
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isWeightValid}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-white/[0.08] disabled:text-white/40 text-white font-medium text-sm md:text-base px-4 md:px-6 py-2.5 md:py-3 rounded-lg transition-colors"
        >
          {saving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>
      </main>
    </div>
  )
}
