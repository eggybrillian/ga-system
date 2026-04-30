"use client"

import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
}

export default function ActionButton({ loading, children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`flex items-center gap-2 text-sm text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 rounded-lg transition-colors ${className}`}
    >
      <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {children}
    </button>
  )
}
