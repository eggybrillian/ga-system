'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Question = {
  id:       string
  text:     string
  category: string
  weight:   string
}

type GroupedQuestions = Record<string, Question[]>

type ObjectInfo = {
  id:   string
  name: string
  type: string
}

type ScoreMap = Record<string, { score: number; comment: string }>

const CATEGORY_LABEL: Record<string, string> = {
  facility_quality:    'Kualitas Fasilitas',
  service_performance: 'Kinerja Layanan',
  user_satisfaction:   'Kepuasan Pengguna',
}

const SCORE_LABEL = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat Baik']

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 disabled:cursor-default"
        >
          <svg
            className={`w-7 h-7 transition-colors ${s <= active ? 'text-amber-400' : 'text-white/10'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {active > 0 && (
        <span className="text-xs text-white/40 ml-1">{SCORE_LABEL[active]}</span>
      )}
    </div>
  )
}

export default function EvaluateFormPage() {
  const router   = useRouter()
  const params   = useParams()
  const objectId = params.objectId as string

  const [object, setObject]     = useState<ObjectInfo | null>(null)
  const [grouped, setGrouped]   = useState<GroupedQuestions>({})
  const [scores, setScores]     = useState<ScoreMap>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]       = useState('')
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch(`/api/objects/${objectId}/questions`)
      .then(r => r.json())
      .then(data => {
        setObject(data.object)
        setGrouped(data.grouped)
      })
      .catch(() => setError('Gagal memuat pertanyaan'))
      .finally(() => setLoading(false))
  }, [objectId])

  // Hitung kelengkapan
  const allQuestions = Object.values(grouped).flat()
  const answered     = allQuestions.filter(q => scores[q.id]?.score > 0).length
  const total        = allQuestions.length
  const isComplete   = answered === total && total > 0

  function setScore(questionId: string, score: number) {
    setSaved(false)
    setScores(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], score },
    }))
  }

  function setComment(questionId: string, comment: string) {
    setSaved(false)
    setScores(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], comment },
    }))
  }

  function buildPayload(isDraft: boolean) {
    return {
      objectId,
      isDraft,
      scores: allQuestions.map(q => ({
        questionId: q.id,
        score:      scores[q.id]?.score ?? 0,
        comment:    scores[q.id]?.comment ?? '',
      })).filter(s => s.score > 0),
    }
  }

  async function saveDraft() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/evaluations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload(true)),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error)
      } else {
        setSaved(true)
      }
    } catch {
      setError('Gagal menyimpan draft')
    } finally {
      setSaving(false)
    }
  }

  async function submitEvaluation() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/evaluations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload(false)),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        setShowConfirm(false)
      } else {
        router.push('/evaluate?submitted=1')
      }
    } catch {
      setError('Gagal mengsubmit evaluasi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-32">

      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/evaluate')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{object?.name}</p>
            <p className="text-white/30 text-xs">{answered}/{total} pertanyaan dijawab</p>
          </div>
          <button
            onClick={saveDraft}
            disabled={saving || answered === 0}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors"
          >
            {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan Draft'}
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-[#3b82f6] transition-all"
            style={{ width: total > 0 ? `${(answered / total) * 100}%` : '0%' }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Render per kategori */}
        {Object.entries(CATEGORY_LABEL).map(([cat, catLabel]) => {
          const qs = grouped[cat]
          if (!qs?.length) return null

          return (
            <section key={cat}>
              <h2 className="text-white/50 text-xs uppercase tracking-widest mb-4 font-medium">
                {catLabel}
              </h2>
              <div className="space-y-4">
                {qs.map((q, idx) => {
                  const currentScore = scores[q.id]?.score ?? 0
                  const isLow        = currentScore > 0 && currentScore <= 2

                  return (
                    <div
                      key={q.id}
                      className={`bg-[#161b27] border rounded-xl p-4 space-y-3 transition-colors
                        ${isLow ? 'border-red-500/30' : 'border-white/[0.08]'}`}
                    >
                      <p className="text-white/80 text-sm leading-relaxed">
                        <span className="text-white/20 mr-2">{idx + 1}.</span>
                        {q.text}
                      </p>

                      <StarRating
                        value={currentScore}
                        onChange={v => setScore(q.id, v)}
                      />

                      {/* Kolom komentar muncul otomatis jika skor ≤ 2 */}
                      {isLow && (
                        <div>
                          <p className="text-red-400 text-xs mb-1.5">
                            Skor rendah — mohon berikan keterangan:
                          </p>
                          <textarea
                            value={scores[q.id]?.comment ?? ''}
                            onChange={e => setComment(q.id, e.target.value)}
                            placeholder="Tuliskan kendala atau masukan..."
                            rows={2}
                            maxLength={500}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                          />
                        </div>
                      )}

                      {/* Komentar opsional untuk skor tinggi */}
                      {currentScore > 2 && (
                        <textarea
                          value={scores[q.id]?.comment ?? ''}
                          onChange={e => setComment(q.id, e.target.value)}
                          placeholder="Komentar (opsional)..."
                          rows={1}
                          maxLength={500}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f1117]/95 backdrop-blur border-t border-white/[0.06] p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!isComplete}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 transition-colors"
          >
            {isComplete
              ? 'Submit Evaluasi'
              : `Jawab ${total - answered} pertanyaan lagi`}
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-white font-semibold">Submit Evaluasi?</h3>
              <p className="text-white/40 text-sm mt-1">
                Setelah disubmit, jawaban tidak dapat diubah.
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl py-2.5 text-sm transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submitEvaluation}
                disabled={submitting}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                {submitting ? 'Mengsubmit...' : 'Ya, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}