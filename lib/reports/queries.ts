import { ReportFilter, ReportData, SummaryScore, ObjectDetailScore, QuestionScore, FeedbackComment } from './types'
import { db } from '../db'
import { evaluationForms, evaluationScores, questions, objects, gaStaff, evaluationPeriods, users } from '../db/schema'
import { calcGAScores } from '../scoring/calculator'
import { eq, and, isNotNull, inArray, sql } from 'drizzle-orm'

export async function getReportData(filters: ReportFilter): Promise<ReportData> {
  // Basic validation
  if (!filters || !filters.periodId) {
    throw new Error('periodId is required')
  }

  // Use existing scoring calculator to get GA-level summary
  const thresholdSetting = 60 // fallback, real value should come from settings table
  const gaScores = await calcGAScores(filters.periodId, undefined, thresholdSetting)

  const summary: SummaryScore[] = gaScores.map((g: any) => ({
    gaId: g.gaId,
    gaName: g.gaName,
    objectCount: g.objectScores?.length || 0,
    avgScore: g.finalScore ?? null,
    breakdown: {
      facility_quality: g.breakdown?.facility_quality ?? null,
      service_performance: g.breakdown?.service_performance ?? null,
      user_satisfaction: g.breakdown?.user_satisfaction ?? null,
    },
    isBelowThreshold: g.isBelow ?? false,
  }))

  // Objects details: try to fetch objects managed by GAs in the period
  // For simplicity, fetch all objects if no gaId filter
  const objectRows = await db.select().from(objects).where(filters.objectId ? eq(objects.id, filters.objectId) : undefined)

  const objectsData: ObjectDetailScore[] = await Promise.all(objectRows.map(async (o: any) => {
    // compute per-object scores by querying evaluationScores joined to questions
      const scores = await db.select({
      category: evaluationScores.category,
      score: evaluationScores.score,
    }).from(evaluationScores).where(
      inArray(evaluationScores.formId, db.select({ id: evaluationForms.id }).from(evaluationForms).where(and(eq(evaluationForms.objectId, o.id), eq(evaluationForms.periodId, filters.periodId as string))))
    )

    // aggregate per category
    const agg: Record<string, { sum: number; count: number }> = {}
    for (const s of scores) {
      if (!agg[s.category]) agg[s.category] = { sum: 0, count: 0 }
      agg[s.category].sum += Number(s.score)
      agg[s.category].count += 1
    }

    const breakdown = {
      facility_quality: agg['facility_quality'] ? agg['facility_quality'].sum / agg['facility_quality'].count : null,
      service_performance: agg['service_performance'] ? agg['service_performance'].sum / agg['service_performance'].count : null,
      user_satisfaction: agg['user_satisfaction'] ? agg['user_satisfaction'].sum / agg['user_satisfaction'].count : null,
    }

    const avgScore = [breakdown.facility_quality, breakdown.service_performance, breakdown.user_satisfaction]
      .filter((x) => x !== null)
      .reduce((acc, v) => acc + (v as number), 0) / ([breakdown.facility_quality, breakdown.service_performance, breakdown.user_satisfaction].filter(Boolean).length || 1)

    // user count
    const userCountResult = await db.select({ count: sql`count(distinct ${evaluationForms.userId})` }).from(evaluationForms).where(and(eq(evaluationForms.objectId, o.id), eq(evaluationForms.periodId, filters.periodId as string)))
    const userCount = (userCountResult as any[])[0]?.count ?? 0

    // fetch PIC name if available
    const pic = o.picGaId ? await db.select({ name: gaStaff.name }).from(gaStaff).where(eq(gaStaff.id, o.picGaId)).then(r => r[0]) : null

    return {
      objectId: o.id,
      objectName: o.name,
      picName: pic?.name ?? null,
      scores: breakdown,
      avgScore: isNaN(avgScore) ? null : Number(avgScore.toFixed(2)),
      userCount: Number(userCount)
    }
  }))

  // Questions aggregation
  const questionAggRows = await db.select({
    questionId: questions.id,
    questionText: questions.text,
    category: questions.category,
    objectType: questions.objectType,
    avgScore: sql`avg(${evaluationScores.score})::numeric`,
    responseCount: sql`count(${evaluationScores.score})`
  }).from(questions).leftJoin(evaluationScores, eq(evaluationScores.questionId, questions.id)).groupBy(questions.id)

  const questionsData: QuestionScore[] = (questionAggRows as any[]).map(q => ({
    questionId: q.questionId,
    questionText: q.questionText,
    category: q.category,
    objectType: q.objectType,
    avgScore: q.avgScore ? Number(Number(q.avgScore).toFixed(2)) : null,
    responseCount: Number(q.responseCount || 0),
  }))

  // Feedback comments
  const commentRows = await db.select({
    formId: evaluationForms.id,
    questionId: evaluationScores.questionId,
    score: evaluationScores.score,
    comment: evaluationScores.comment,
    userId: evaluationForms.userId,
    createdAt: evaluationForms.submittedAt,
  }).from(evaluationScores).innerJoin(evaluationForms, eq(evaluationForms.id, evaluationScores.formId)).where(and(eq(evaluationForms.periodId, filters.periodId as string), isNotNull(evaluationScores.comment)))

  const comments: FeedbackComment[] = await Promise.all((commentRows as any[]).map(async (c) => {
    const user = await db.select({ name: users.name }).from(users).where(eq(users.id, c.userId)).then(r => r[0])
    const q = await db.select({ text: questions.text }).from(questions).where(eq(questions.id, c.questionId)).then(r => r[0])
    return {
      formId: c.formId,
      questionId: c.questionId,
      questionText: q?.text ?? undefined,
      score: Number(c.score),
      comment: c.comment,
      userName: user?.name ?? null,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null
    }
  }))

  const reportData: ReportData = {
    filters,
    summary,
    objects: objectsData,
    questions: questionsData,
    comments,
  }

  return reportData
}
