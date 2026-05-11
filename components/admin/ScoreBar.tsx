"use client"

import React from 'react'

export default function ScoreBar({ value, isBelow, threshold = 60 }: { value: number | null; isBelow?: boolean; threshold?: number }) {
  if (value === null) {
    return <span className="text-white/20 text-sm">Belum ada data</span>
  }
  const color = (isBelow || value < threshold)
    ? 'bg-red-500'
    : value >= 75
      ? 'bg-emerald-500'
      : 'bg-amber-500'

  const textColor = (isBelow || value < threshold)
    ? 'text-red-400'
    : value >= 75
      ? 'text-emerald-400'
      : 'text-amber-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-10 text-right shrink-0 ${textColor}`}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}
