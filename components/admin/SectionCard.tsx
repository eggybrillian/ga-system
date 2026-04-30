"use client"

import React from 'react'

type Props = {
  title?: string
  children?: React.ReactNode
  className?: string
}

export default function SectionCard({ title, children, className = '' }: Props) {
  return (
    <div className={`bg-[#161b27] border border-white/[0.08] rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 md:px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-medium text-sm">{title}</h2>
        </div>
      )}
      <div className="px-4 md:px-5 py-4">{children}</div>
    </div>
  )
}
