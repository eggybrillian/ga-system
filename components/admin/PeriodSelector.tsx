"use client"

import { useState, useEffect, useRef } from 'react'

type Period = { id: string; label: string; startDate: string; endDate: string }

type Props = {
  periods: Period[]
  selected: string[]
  onChange: (ids: string[]) => void
  compact?: boolean
}

export default function PeriodSelector({ periods, selected, onChange, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current) return
      if (!root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const filtered = periods.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={root} className="relative inline-block">
      <button
        onClick={() => setOpen(s => !s)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/[0.06] bg-[#0f1117] text-sm text-white ${compact ? 'px-2 py-1 text-xs' : ''}`}
      >
        <span>{selected.length === 0 ? 'Pilih Periode' : (selected.length === 1 ? periods.find(p => p.id === selected[0])?.label ?? 'Periode' : `${selected.length} terpilih`)}</span>
        <svg className={`w-3 h-3 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-72 bg-[#0b0c10] border border-white/[0.06] rounded-lg shadow-lg p-3">
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari periode..."
              className="w-full bg-transparent border border-white/[0.04] rounded px-2 py-1 text-sm text-white placeholder-white/30 focus:outline-none"
            />
          </div>

          <div className="max-h-48 overflow-auto space-y-1">
            {filtered.length === 0 ? (
              <div className="text-white/30 text-sm py-2">Tidak ada periode</div>
            ) : (
              filtered.map(p => {
                const checked = selected.includes(p.id)
                return (
                  <label key={p.id} className="flex items-center gap-3 px-1 py-1 rounded hover:bg-white/[0.02] cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? selected.filter(s => s !== p.id) : [...selected, p.id]
                        onChange(next)
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.label}</div>
                      <div className="text-white/30 text-xs">{new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}</div>
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button onClick={() => onChange(periods.map(p => p.id))} className="text-xs px-2 py-1 bg-white/[0.04] rounded">All</button>
              <button onClick={() => onChange([])} className="text-xs px-2 py-1 bg-white/[0.04] rounded">Clear</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 bg-white/[0.02] rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
