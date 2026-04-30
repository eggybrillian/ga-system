"use client"

import React from 'react'

export default function StatusBadge({ isBelow, score }: { isBelow: boolean; score: number | null }) {
  if (score === null) {
    return <span className="text-xs bg-gray-500/15 text-gray-400 border border-gray-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">— Tidak ada data</span>
  }
  if (isBelow) {
    return <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">⚠ Di bawah threshold</span>
  }
  return <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">✓ Memenuhi threshold</span>
}
