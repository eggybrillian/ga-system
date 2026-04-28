// app/(user)/evaluate/components/EvaluationForm.tsx
'use client'

import { useEffect, useState } from 'react'

type Question = {
  id: string
  text: string
  weight: number
  sortOrder: number
}

type Questions = {
  facility_quality: Question[]
  service_performance: Question[]
  user_satisfaction: Question[]
}

type QuestionsResponse = Questions

type Answer = {
  questionId: string
  score: number
  comment: string
}

interface EvaluationFormProps {
  objectId: string
  periodId: string
  onBack: () => void
}

const categoryLabels = {
  facility_quality: 'Kualitas Fasilitas',
  service_performance: 'Kinerja Layanan',
  user_satisfaction: 'Kepuasan Pengguna',
}

export default function EvaluationForm({
  objectId,
  periodId,
  onBack,
}: EvaluationFormProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [objectName, setObjectName] = useState('')
  const [questions, setQuestions] = useState<Questions>({
    facility_quality: [],
    service_performance: [],
    user_satisfaction: [],
  })
  const [answers, setAnswers] = useState<Record<string, Answer>>({})

  useEffect(() => {
    fetchQuestions()
  }, [objectId])

  async function fetchQuestions() {
    try {
      setLoading(true)
      const res = await fetch(`/api/objects/${objectId}/questions`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setObjectName(data.object.name)
      const typedQuestions: QuestionsResponse = data.questions
      setQuestions(typedQuestions)

      // Initialize answers
      const initialAnswers: Record<string, Answer> = {}
      Object.values(typedQuestions).forEach((categoryQuestions: Question[]) => {
        categoryQuestions.forEach(q => {
          initialAnswers[q.id] = { questionId: q.id, score: 0, comment: '' }
        })
      })
      setAnswers(initialAnswers)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateAnswer(questionId: string, score: number, comment: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, score, comment },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const scores = Object.values(answers)
        .filter(a => a.score > 0)
        .map(a => ({
          questionId: a.questionId,
          score: a.score,
          comment: a.comment || undefined,
        }))

      if (scores.length === 0) {
        throw new Error('Minimal satu pertanyaan harus dijawab')
      }

      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId,
          periodId,
          scores,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Gagal submit evaluasi')
      }

      alert('Evaluasi berhasil disubmit!')
      onBack()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white/60">Loading pertanyaan...</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
        <p>{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg font-medium transition-all"
        >
          ← Kembali
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 text-sm mb-3 flex items-center gap-1"
          >
            ← Kembali ke daftar
          </button>
          <h2 className="text-2xl font-bold">{objectName}</h2>
        </div>
      </div>

      {/* Categories with questions */}
      <div className="space-y-8">
        {(Object.entries(questions) as Array<[keyof typeof categoryLabels, Question[]]>).map(
          ([category, categoryQuestions]) => (
            categoryQuestions.length > 0 && (
              <div key={category} className="bg-[#161b27] border border-white/[0.08] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6 pb-4 border-b border-white/[0.1]">
                  {categoryLabels[category]}
                </h3>

                <div className="space-y-6">
                  {categoryQuestions.map(question => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      answer={answers[question.id]}
                      onChange={(score, comment) =>
                        updateAnswer(question.id, score, comment)
                      }
                    />
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Submit button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition-all"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-all"
        >
          {submitting ? 'Mengirim...' : 'Submit Evaluasi'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}
    </form>
  )
}

// ============================================================
// Question Card Component
// ============================================================

interface QuestionCardProps {
  question: Question
  answer: { questionId: string; score: number; comment: string }
  onChange: (score: number, comment: string) => void
}

function QuestionCard({ question, answer, onChange }: QuestionCardProps) {
  return (
    <div className="border border-white/[0.05] rounded-lg p-4 bg-white/[0.02]">
      <div className="mb-4">
        <p className="text-white/80 font-medium">{question.text}</p>
        <p className="text-white/40 text-xs mt-1">Weight: {question.weight}</p>
      </div>

      {/* Star Rating */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score, answer.comment)}
            className={`w-10 h-10 rounded-lg font-semibold transition-all ${
              answer.score === score
                ? 'bg-yellow-500 text-black'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {score}
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={answer.comment}
        onChange={e => onChange(answer.score, e.target.value)}
        placeholder="Tambahkan komentar (opsional, max 500 karakter)"
        maxLength={500}
        className="w-full bg-white/10 text-white placeholder-white/40 border border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/[0.2] transition-all resize-none"
        rows={2}
      />
      {answer.comment && (
        <p className="text-white/40 text-xs mt-1">
          {answer.comment.length}/500
        </p>
      )}
    </div>
  )
}
