"use client"

import React from 'react'

type Props = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className={actions ? 'flex items-start justify-between gap-3' : 'flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'}>
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-white/30 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  )
}
