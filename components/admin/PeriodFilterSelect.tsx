'use client'

import { useRouter } from 'next/navigation'

type PeriodOption = {
  id: string
  label: string
}

type PeriodFilterSelectProps = {
  userId: string
  periods: PeriodOption[]
  selectedPeriodId: string
}

export default function PeriodFilterSelect({ userId, periods, selectedPeriodId }: PeriodFilterSelectProps) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <div className="text-white/35 text-xs uppercase tracking-[0.12em]">Filter Periode</div>
      <select
        value={selectedPeriodId}
        onChange={(event) => {
          const value = event.target.value
          const url = value === 'all' ? `/admin/users/${userId}` : `/admin/users/${userId}?period=${encodeURIComponent(value)}`
          router.push(url)
        }}
        className="w-full rounded-xl border border-white/[0.08] bg-[#0f1117] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500/40"
      >
        <option value="all">Semua periode</option>
        {periods.map(period => (
          <option key={period.id} value={period.id}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  )
}
