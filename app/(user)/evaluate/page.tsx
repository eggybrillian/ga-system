'use client'

import { useEffect, useState } from 'react'
import ObjectList from './components/ObjectList'
import EvaluationForm from './components/EvaluationForm'

type ObjectData = {
  id: string
  name: string
  type: string
  picName: string
  hasSubmitted: boolean
}

type Period = {
  id: string
  label: string
  status: string
}

export default function EvaluatePage() {
  const [period, setPeriod] = useState<Period | null>(null)
  const [objects, setObjects] = useState<ObjectData[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchObjects()
  }, [])

  async function fetchObjects() {
    try {
      const res = await fetch('/api/objects')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setPeriod(data.period)
      setObjects(data.objects)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Evaluasi Fasilitas</h1>
          {period && (
            <div className="flex items-center gap-3">
              <span className="text-white/60">Periode:</span>
              <span className="font-medium">{period.label}</span>
              <span
                className={`text-xs uppercase tracking-wider rounded-full px-2.5 py-0.5 ${
                  period.status === 'open'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {period.status}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        {selectedObjectId ? (
          <EvaluationForm
            objectId={selectedObjectId}
            periodId={period?.id || ''}
            onBack={() => {
              setSelectedObjectId(null)
              fetchObjects() // Refresh list after submission
            }}
          />
        ) : (
          <ObjectList
            objects={objects}
            onSelectObject={setSelectedObjectId}
            periodOpen={period?.status === 'open'}
          />
        )}
      </div>
    </div>
  )
}