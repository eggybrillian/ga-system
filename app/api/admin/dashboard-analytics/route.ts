// app/api/admin/dashboard-analytics/route.ts
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  evaluationPeriods,
  evaluationForms,
  evaluationScores,
  questions,
  objectTypes,
  objects,
  gaStaff,
} from '@/lib/db/schema'
import { eq, and, isNotNull, lte, sql, inArray } from 'drizzle-orm'
import { calcGAScores, calcGAScoresForPeriodIds, getSettings } from '@/lib/scoring/calculator'

export async function GET(request: Request) {
  try {
    await requireRole('admin', 'superadmin')

    const url = new URL(request.url)
    const periodIds = url.searchParams.getAll('periodId')

    // Resolve period IDs: use provided ones or get active period
    let resolvedPeriodIds: string[] = []
    if (periodIds.length === 0) {
      const activePeriod = await db.query.evaluationPeriods.findFirst({
        where: eq(evaluationPeriods.status, 'open'),
        orderBy: (periods, { desc }) => [desc(periods.updatedAt)],
      })
      if (activePeriod) {
        resolvedPeriodIds = [activePeriod.id]
      }
    } else {
      resolvedPeriodIds = periodIds
    }

    const periodRows = resolvedPeriodIds.length > 0
      ? await db.query.evaluationPeriods.findMany({
          where: (q, { inArray }) => inArray(q.id, resolvedPeriodIds),
        })
      : []
    const periodMap = new Map(periodRows.map((period) => [period.id, period]))

    if (resolvedPeriodIds.length === 0) {
      return NextResponse.json({
        topLowestObjects: [],
        topLowestQuestions: [],
        criticalFeedback: [],
        categoryAverages: {},
      })
    }

    const { threshold } = await getSettings()

    // 1. Top 5 objects with lowest weighted scores, but only below threshold
    const gaScores = await calcGAScoresForPeriodIds(resolvedPeriodIds, undefined, threshold)

    const allObjects = (
      await Promise.all(
        resolvedPeriodIds.map(async (periodId) => {
          const periodLabel = periodMap.get(periodId)?.label ?? periodId
          const periodScores = await calcGAScores(periodId, undefined, threshold)

          return periodScores.flatMap((ga) =>
            ga.objectScores
              .filter((obj) => obj.scores.final !== null)
              .map((obj) => ({
                periodId,
                periodLabel,
                objectId: obj.objectId,
                objectName: obj.objectName,
                objectType: obj.objectType,
                gaName: ga.gaName,
                avgScore100: ((obj.scores.final as number) / 5) * 100,
                submissionCount: obj.submissionCount,
              }))
          )
        })
      )
    ).flat()

    const topLowestObjects = allObjects
      .filter((item) => item.avgScore100 < threshold)
      .sort((a, b) => a.avgScore100 - b.avgScore100)
      .slice(0, 5)
      .map((o) => ({
        periodId: o.periodId,
        periodLabel: o.periodLabel,
        objectId: o.objectId,
        objectName: o.objectName,
        objectType: o.objectType,
        gaName: o.gaName,
        avgScore: Math.round(o.avgScore100 * 10) / 10,
        submissionCount: o.submissionCount,
      }))

    // 2. Low questions grouped by object using raw response scores (no averaging)
    const questionScores = await db
      .select({
        periodId: evaluationForms.periodId,
        periodLabel: evaluationPeriods.label,
        objectId: objects.id,
        objectName: objects.name,
        objectType: objectTypes.slug,
        gaName: gaStaff.name,
        questionId: questions.id,
        questionText: questions.text,
        category: questions.category,
        score: evaluationScores.score,
      })
      .from(questions)
      .innerJoin(
        evaluationScores,
        eq(questions.id, evaluationScores.questionId)
      )
      .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
      .innerJoin(evaluationPeriods, eq(evaluationForms.periodId, evaluationPeriods.id))
      .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
      .innerJoin(objectTypes, eq(objects.objectTypeId, objectTypes.id))
      .innerJoin(gaStaff, eq(objects.picGaId, gaStaff.id))
      .where(
        and(
          inArray(evaluationForms.periodId, resolvedPeriodIds),
          isNotNull(evaluationForms.submittedAt),
          eq(questions.isActive, true),
          lte(evaluationScores.score, 2)
        )
      )
      .orderBy(evaluationScores.score, evaluationForms.createdAt)

    const questionMap = new Map<string, {
      objectId: string
      objectName: string
      objectType: string
      gaName: string
      questionsMap: Map<string, {
        groupKey: string
        periodId: string
        periodLabel: string
        questionId: string
        questionText: string
        category: string
        score: number
        responseCount: number
      }>
      lowestScore: number
    }>()

    for (const row of questionScores) {
      const score = row.score
      const existingKey = row.objectId
      const existing = questionMap.get(existingKey)

      if (!existing) {
        const questionsMap = new Map<string, {
          groupKey: string
          periodId: string
          periodLabel: string
          questionId: string
          questionText: string
          category: string
          score: number
          responseCount: number
        }>()
        const groupKey = `${row.periodId}:${row.questionId}:${score}`
        questionsMap.set(groupKey, {
          groupKey,
          periodId: row.periodId,
          periodLabel: row.periodLabel,
          questionId: row.questionId,
          questionText: row.questionText,
          category: row.category,
          score,
          responseCount: 1,
        })

        questionMap.set(existingKey, {
          objectId: row.objectId,
          objectName: row.objectName,
          objectType: row.objectType,
          gaName: row.gaName,
          questionsMap,
          lowestScore: score,
        })
      } else {
        const groupKey = `${row.periodId}:${row.questionId}:${score}`
        const grouped = existing.questionsMap.get(groupKey)
        if (grouped) {
          grouped.responseCount += 1
        } else {
          existing.questionsMap.set(groupKey, {
            groupKey,
            periodId: row.periodId,
            periodLabel: row.periodLabel,
            questionId: row.questionId,
            questionText: row.questionText,
            category: row.category,
            score,
            responseCount: 1,
          })
        }
        existing.lowestScore = Math.min(existing.lowestScore, score)
      }
    }

    const topLowestQuestions = Array.from(questionMap.values())
      .sort((a, b) => a.lowestScore - b.lowestScore)
      .slice(0, 5)
      .map((item) => ({
        objectId: item.objectId,
        objectName: item.objectName,
        objectType: item.objectType,
        gaName: item.gaName,
        questions: Array.from(item.questionsMap.values())
          .sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score
            if (a.responseCount !== b.responseCount) return b.responseCount - a.responseCount
            return a.periodLabel.localeCompare(b.periodLabel)
          }),
      }))

    // 3. Critical feedback (score ≤ 2)
    const criticalFeedback = await db
      .select({
        scoreId: evaluationScores.id,
        periodId: evaluationForms.periodId,
        periodLabel: evaluationPeriods.label,
        gaName: gaStaff.name,
        comment: evaluationScores.comment,
        score: evaluationScores.score,
        category: evaluationScores.category,
        questionText: questions.text,
        objectName: objects.name,
        createdAt: evaluationForms.createdAt,
      })
      .from(evaluationScores)
      .innerJoin(questions, eq(evaluationScores.questionId, questions.id))
      .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
      .innerJoin(evaluationPeriods, eq(evaluationForms.periodId, evaluationPeriods.id))
      .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
      .innerJoin(gaStaff, eq(objects.picGaId, gaStaff.id))
      .where(
        and(
          inArray(evaluationForms.periodId, resolvedPeriodIds),
          isNotNull(evaluationForms.submittedAt),
          lte(evaluationScores.score, 2),
          isNotNull(evaluationScores.comment),
          sql`trim(${evaluationScores.comment}) <> ''`
        )
      )
      .orderBy(evaluationForms.createdAt)
      .limit(10)

    const criticalFeedbackData = criticalFeedback.map((cf) => ({
      scoreId: cf.scoreId,
      periodId: cf.periodId,
      periodLabel: cf.periodLabel,
      gaName: cf.gaName,
      score: cf.score,
      category: cf.category,
      comment: cf.comment,
      questionText: cf.questionText,
      objectName: cf.objectName,
    }))

    // 4. Category averages based on weighted object scores
    const categoryBuckets: Record<string, number[]> = {
      facility_quality: [],
      service_performance: [],
      user_satisfaction: [],
    }

    for (const ga of gaScores) {
      for (const obj of ga.objectScores) {
        if (obj.submissionCount === 0) continue
        for (const [category, value] of Object.entries(obj.scores)) {
          if (category === 'final' || value === null) continue
          categoryBuckets[category]?.push(value)
        }
      }
    }

    const categoryAvg: Record<string, number> = {}
    for (const [category, values] of Object.entries(categoryBuckets)) {
      if (values.length > 0) {
        const avg = values.reduce((sum, value) => sum + value, 0) / values.length
        categoryAvg[category] = Math.round((avg / 5) * 1000) / 10
      }
    }

    return NextResponse.json({
      topLowestObjects,
      topLowestQuestions,
      criticalFeedback: criticalFeedbackData,
      categoryAverages: categoryAvg,
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
