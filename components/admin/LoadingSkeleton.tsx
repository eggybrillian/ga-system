"use client"

import React from 'react'

export default function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-white/[0.03] rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
