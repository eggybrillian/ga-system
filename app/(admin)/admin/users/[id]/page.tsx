import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth/session'
import { users, evaluationForms } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import PeriodFilterSelect from '@/components/admin/PeriodFilterSelect'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ period?: string }>
}

function formatDate(dateStr: Date | string | null) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAverage(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return value.toFixed(2)
}

function getFormAverage(form: any) {
  const scores = Array.isArray(form?.scores) ? form.scores : []
  if (scores.length === 0) return null

  const total = scores.reduce((sum: number, score: any) => sum + Number(score.score || 0), 0)
  return total / scores.length
}

function getCategoryAverage(scores: any[], category: string) {
  const categoryScores = scores.filter(score => score.category === category)
  if (categoryScores.length === 0) return null
  const total = categoryScores.reduce((sum: number, score: any) => sum + Number(score.score || 0), 0)
  return total / categoryScores.length
}

function getAverage(values: Array<number | null>) {
  const filteredValues = values.filter((value): value is number => value !== null)
  if (filteredValues.length === 0) return null
  return filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length
}

function getPeriodSortValue(form: any) {
  const periodDate = form?.period?.startDate || form?.period?.endDate || form?.submittedAt
  return new Date(periodDate ?? 0).getTime()
}

function getObjectSortValue(form: any) {
  return String(form?.object?.name || '').toLowerCase()
}

export default async function UserDetailPage({ params, searchParams }: PageProps) {
  try {
    await requireRole('admin', 'superadmin')
  } catch {
    redirect('/admin/dashboard')
  }

  const { id } = await params
  const { period: selectedPeriodId = 'all' } = await searchParams

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  })

  if (!user) {
    return (
      <div className="space-y-6">
        <main className="max-w-7xl mx-auto px-4 md:px-2 py-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-8 text-center">
            <h1 className="text-xl font-semibold text-white">User tidak ditemukan</h1>
            <p className="mt-2 text-sm text-white/40">Data user yang diminta tidak tersedia.</p>
          </div>
        </main>
      </div>
    )
  }

  const forms = await db.query.evaluationForms.findMany({
    where: eq(evaluationForms.userId, id),
    orderBy: [desc(evaluationForms.submittedAt)],
    with: {
      object: true,
      period: true,
      scores: {
        with: {
          question: true,
        },
      },
    },
  })

  const completedForms = forms.filter(form => !form.isDraft)
  const sortedForms = [...completedForms].sort((a, b) => {
    const periodDiff = getPeriodSortValue(b) - getPeriodSortValue(a)
    if (periodDiff !== 0) return periodDiff

    const objectDiff = getObjectSortValue(a).localeCompare(getObjectSortValue(b))
    if (objectDiff !== 0) return objectDiff

    return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime()
  })

  const groupedPeriods = sortedForms.reduce((periodAcc: any[], form) => {
    const periodId = form.period?.id || 'unknown-period'
    let periodGroup = periodAcc.find(group => group.id === periodId)

    if (!periodGroup) {
      periodGroup = {
        id: periodId,
        label: form.period?.label || 'Periode tidak diketahui',
        startDate: form.period?.startDate || null,
        objects: [] as any[],
      }
      periodAcc.push(periodGroup)
    }

    const objectId = form.object?.id || 'unknown-object'
    let objectGroup = periodGroup.objects.find((group: any) => group.id === objectId)

    if (!objectGroup) {
      objectGroup = {
        id: objectId,
        name: form.object?.name || 'Objek tidak diketahui',
        type: form.object?.type || 'object',
        forms: [] as any[],
      }
      periodGroup.objects.push(objectGroup)
    }

    objectGroup.forms.push(form)
    return periodAcc
  }, [])

  const formAverages = completedForms
    .map(form => getFormAverage(form))
  const overallAverage = getAverage(formAverages)

  const visiblePeriods = selectedPeriodId === 'all'
    ? groupedPeriods
    : groupedPeriods.filter(period => period.id === selectedPeriodId)

  const activePeriodLabel = selectedPeriodId === 'all'
    ? 'Semua periode'
    : groupedPeriods.find(period => period.id === selectedPeriodId)?.label || 'Periode tidak diketahui'

  return (
    <div className="space-y-6">
      <main className="max-w-7xl mx-auto px-4 md:px-2 py-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Riwayat Evaluasi — {user.name}</h1>
            <p className="mt-1 text-sm text-white/40">Menampilkan submission dan detail skor per pertanyaan.</p>
          </div>
          <a
            href="/admin/users"
            className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.10] hover:text-white"
          >
            Kembali
          </a>
        </div>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-4">
            <div className="text-white/35 text-xs uppercase tracking-[0.12em]">Nama</div>
            <div className="mt-2 text-lg font-semibold text-white">{user.name}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-4">
            <div className="text-white/35 text-xs uppercase tracking-[0.12em]">NIK</div>
            <div className="mt-2 text-lg font-semibold text-white">{user.nik}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-4">
            <div className="text-white/35 text-xs uppercase tracking-[0.12em]">Total Form</div>
            <div className="mt-2 text-lg font-semibold text-white">{completedForms.length}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-4">
            <div className="text-white/35 text-xs uppercase tracking-[0.12em]">Rata-rata Skor</div>
            <div className="mt-2 text-lg font-semibold text-blue-300">{formatAverage(overallAverage)}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-4">
          <div className="mb-2 text-sm text-white/40">Menampilkan form berdasarkan periode yang dipilih.</div>
          <PeriodFilterSelect
            userId={id}
            periods={groupedPeriods.map(period => ({ id: period.id, label: period.label }))}
            selectedPeriodId={selectedPeriodId}
          />
        </section>

        {visiblePeriods.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-12 text-center">
            <p className="text-white/30 text-sm">Tidak ada riwayat evaluasi pada periode yang dipilih.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visiblePeriods.map((period) => (
              <section key={period.id} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#101521] p-5">
                <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/35">
                      Periode
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-white">{period.label}</h2>
                    <p className="mt-1 text-sm text-white/35">{period.objects.length} objek pada periode ini</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {period.objects.map((objectGroup: any) => (
                    <article key={objectGroup.id} className="rounded-2xl border border-white/[0.08] bg-[#161b27] p-5 space-y-4">
                      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/35">
                            {objectGroup.type}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-white">{objectGroup.name}</div>
                          <div className="mt-1 text-sm text-white/35">{objectGroup.forms.length} form pada objek ini</div>
                        </div>

                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 sm:text-right shrink-0">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-blue-200/70">Rata-rata Form</div>
                          <div className="text-lg font-semibold text-blue-300">
                            {formatAverage(getAverage(objectGroup.forms.map((form: any) => getFormAverage(form))))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {objectGroup.forms.map((form: any) => {
                          const categoryScores = form.scores || []
                          return (
                            <section key={form.id} className="rounded-2xl border border-white/[0.06] bg-[#0f1117] p-4 space-y-4">
                              <div className="border-b border-white/[0.06] pb-4">
                                <div>
                                  <div className="text-sm text-white/35">Submitted: {formatDate(form.submittedAt)}</div>
                                </div>
                              </div>

                              <div className="space-y-3 text-sm">
                                {categoryScores.length > 0 ? (
                                  categoryScores.map((score: any) => (
                                    <div key={score.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2 min-w-0">
                                          <span className="inline-flex w-fit items-center rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/40">
                                            {score.category.replace('_', ' ')}
                                          </span>
                                          <div className="text-white leading-snug">
                                            {score.question?.text || '—'}
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-white/[0.08] bg-[#161b27] px-2.5 py-1 text-sm font-semibold text-white sm:shrink-0">
                                          {score.score}
                                        </div>
                                      </div>
                                      {score.comment && <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-white/45">“{score.comment}”</div>}
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-white/30">Tidak ada skor pada form ini.</div>
                                )}
                              </div>
                            </section>
                          )
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
