import { db } from '@/lib/db'
import { evaluationForms, evaluationScores, evaluationPeriods, objects, gaStaff, questions, users } from '@/lib/db/schema'
import { and, eq, inArray, isNotNull, lte, sql } from 'drizzle-orm'
import { calcGAScores, calcGAScoresForPeriodIds, getSettings } from '@/lib/scoring/calculator'

export type GAReportPeriod = {
  id: string
  label: string
  startDate: string
  endDate: string
}

export type GAReportObject = {
  periodId: string
  periodLabel: string
  objectId: string
  objectName: string
  objectType: string
  gaId: string
  gaName: string
  avgScore: number | null
  submissionCount: number
  scores: {
    facility_quality: number | null
    service_performance: number | null
    user_satisfaction: number | null
    final: number | null
  }
}

export type GAReportFeedback = {
  periodId: string
  periodLabel: string
  score: number
  category: string
  comment: string | null
  questionText: string
  objectName: string
  evaluatorName: string
  createdAt: string | null
}

export type GAReportData = {
  period: GAReportPeriod | null
  threshold: number
  gaScores: Awaited<ReturnType<typeof calcGAScores>>
  objects: GAReportObject[]
  criticalFeedback: GAReportFeedback[]
  stats: {
    totalSubmissions: number
    totalObjects: number
    gaBelow: number
    gaScored: number
    gaTotal: number
  }
}

async function resolvePeriods(periodIds?: string[] | null) {
  if (periodIds && periodIds.length > 0) {
    return db.query.evaluationPeriods.findMany({
      where: inArray(evaluationPeriods.id, periodIds),
      orderBy: (p, { asc }) => [asc(p.startDate)],
    })
  }

  const openPeriod = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.status, 'open'),
    orderBy: (p, { desc }) => [desc(p.startDate)],
  })

  return openPeriod ? [openPeriod] : []
}

export async function getGAReportData(periodIds?: string[] | null): Promise<GAReportData> {
  const periods = await resolvePeriods(periodIds)
  const settings = await getSettings()

  if (periods.length === 0) {
    return {
      period: null,
      threshold: settings.threshold,
      gaScores: [],
      objects: [],
      criticalFeedback: [],
      stats: {
        totalSubmissions: 0,
        totalObjects: 0,
        gaBelow: 0,
        gaScored: 0,
        gaTotal: 0,
      },
    }
  }

  const periodIdsToUse = periods.map((item) => item.id)
  const weights = {
    facility_quality: settings.weight_facility_quality,
    service_performance: settings.weight_service_performance,
    user_satisfaction: settings.weight_user_satisfaction,
  }

  const gaScores = periodIdsToUse.length > 1
    ? await calcGAScoresForPeriodIds(periodIdsToUse, weights, settings.threshold)
    : await calcGAScores(periodIdsToUse[0], weights, settings.threshold)

  // Keep object-level rows split by period so multi-period exports do not collapse into one row.
  const periodScores = await Promise.all(
    periods.map(async (period) => {
      const rows = await calcGAScores(period.id, weights, settings.threshold)
      return { period, rows }
    })
  )

  const objectsReport: GAReportObject[] = periodScores.flatMap(({ period, rows }) =>
    rows.flatMap((ga) =>
      ga.objectScores.map((obj) => ({
        periodId: period.id,
        periodLabel: period.label,
        objectId: obj.objectId,
        objectName: obj.objectName,
        objectType: obj.objectType,
        gaId: ga.gaId,
        gaName: ga.gaName,
        avgScore: obj.scores.final,
        submissionCount: obj.submissionCount,
        scores: obj.scores,
      }))
    )
  )

  const totalSubmissionsRows = await db
    .select({ count: sql<number>`count(distinct ${evaluationForms.id})` })
    .from(evaluationForms)
    .where(and(
      inArray(evaluationForms.periodId, periodIdsToUse),
      eq(evaluationForms.isDraft, false),
      isNotNull(evaluationForms.submittedAt),
    ))

  const criticalFeedbackRows = await db
    .select({
      periodId: evaluationPeriods.id,
      periodLabel: evaluationPeriods.label,
      score: evaluationScores.score,
      category: evaluationScores.category,
      comment: evaluationScores.comment,
      questionText: questions.text,
      objectName: objects.name,
      evaluatorName: users.name,
      createdAt: evaluationForms.createdAt,
    })
    .from(evaluationScores)
    .innerJoin(questions, eq(evaluationScores.questionId, questions.id))
    .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
    .innerJoin(evaluationPeriods, eq(evaluationForms.periodId, evaluationPeriods.id))
    .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
    .innerJoin(users, eq(evaluationForms.userId, users.id))
    .where(and(
      inArray(evaluationForms.periodId, periodIdsToUse),
      isNotNull(evaluationForms.submittedAt),
      lte(evaluationScores.score, 2),
      isNotNull(evaluationScores.comment),
    ))
    .orderBy((t) => t.createdAt)

  const criticalFeedback = (criticalFeedbackRows as any[]).map((row) => ({
    periodId: row.periodId,
    periodLabel: row.periodLabel,
    score: row.score,
    category: row.category,
    comment: row.comment,
    questionText: row.questionText,
    objectName: row.objectName,
    evaluatorName: row.evaluatorName,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  }))

  return {
    period: {
      id: periods.length === 1 ? periods[0].id : periodIdsToUse.join(','),
      label: periods.length === 1 ? periods[0].label : `${periods.length} periode terpilih`,
      startDate: periods[0].startDate.toISOString(),
      endDate: periods[periods.length - 1].endDate.toISOString(),
    },
    threshold: settings.threshold,
    gaScores,
    objects: objectsReport,
    criticalFeedback,
    stats: {
      totalSubmissions: Number((totalSubmissionsRows as any[])[0]?.count ?? 0),
      totalObjects: objectsReport.length,
      gaBelow: gaScores.filter((g) => g.isBelow).length,
      gaScored: gaScores.filter((g) => g.finalScore !== null).length,
      gaTotal: gaScores.length,
    },
  }
}
