'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [nik, setNik]           = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nik, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login gagal')
        return
      }

      // Redirect sesuai role
      const role = data.user.role as string
      if (role === 'admin' || role === 'superadmin') {
        router.push('/admin/dashboard')
      } else if (role === 'ga_staff') {
        router.push('/ga/dashboard')
      } else {
        router.push('/evaluate')
      }
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm">

        {/* Glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#3b82f6]/30 to-transparent pointer-events-none" />

        <div className="relative bg-[#161b27] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">

          {/* Logo / Header */}
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6] flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-white text-xl font-semibold tracking-tight">
              Sistem Evaluasi GA
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Masuk dengan NIK karyawan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                NIK
              </label>
              <input
                type="text"
                value={nik}
                onChange={e => setNik(e.target.value)}
                placeholder="Contoh: U001"
                required
                autoFocus
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#3b82f6]/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#3b82f6]/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 transition-colors mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-white/20 text-xs text-center mt-6">
            General Affairs · PT. Perusahaan
          </p>
        </div>
      </div>
    </div>
  )
}