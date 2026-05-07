// app/api/admin/dashboard-analytics/route.ts
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  evaluationPeriods,
  evaluationForms,
  evaluationScores,
  questions,
  objects,
  gaStaff,
} from '@/lib/db/schema'
import { eq, and, isNotNull, lte, sql, inArray } from 'drizzle-orm'
import { calcGAScoresForPeriodIds, getSettings } from '@/lib/scoring/calculator'

export async function GET(request: Request) {
  try {
    await requireRole('admin', 'superadmin')

    const url = new URL(request.url)
    const periodIds = url.searchParams.getAll('periodId')

    // Resolve period IDs: use provided ones or get active period
    let resolvedPeriodIds: string[] = []
    if (periodIds.length === 0) {
      const activePeriod = await db.query.evaluationPeriods.findFirst({ where: eq(evaluationPeriods.status, 'open') })
      if (activePeriod) {
        resolvedPeriodIds = [activePeriod.id]
      }
    } else {
      resolvedPeriodIds = periodIds
    }

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

    const allObjects = gaScores.flatMap((ga) =>
      ga.objectScores
        .filter((obj) => obj.scores.final !== null)
        .map((obj) => ({
          objectId: obj.objectId,
          objectName: obj.objectName,
          objectType: obj.objectType,
          gaName: ga.gaName,
          avgScore100: ((obj.scores.final as number) / 5) * 100,
          submissionCount: obj.submissionCount,
        }))
    )

    const topLowestObjects = allObjects
      .filter((item) => item.avgScore100 < threshold)
      .sort((a, b) => a.avgScore100 - b.avgScore100)
      .slice(0, 5)
      .map((o) => ({
        objectId: o.objectId,
        objectName: o.objectName,
        objectType: o.objectType,
        gaName: o.gaName,
        avgScore: Math.round(o.avgScore100 * 10) / 10,
        submissionCount: o.submissionCount,
      }))

    // 2. Low questions grouped by object (avg score below 3 on 1-5 scale)
    const questionScores = await db
      .select({
        objectId: objects.id,
        objectName: objects.name,
        objectType: objects.type,
        gaName: gaStaff.name,
        questionId: questions.id,
        questionText: questions.text,
        category: questions.category,
        avgScore: sql<number>`AVG(${evaluationScores.score})`,
        responseCount: sql<number>`COUNT(${evaluationScores.id})`,
      })
      .from(questions)
      .innerJoin(
        evaluationScores,
        eq(questions.id, evaluationScores.questionId)
      )
      .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
      .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
      .innerJoin(gaStaff, eq(objects.picGaId, gaStaff.id))
      .where(
        and(
          inArray(evaluationForms.periodId, resolvedPeriodIds),
          isNotNull(evaluationForms.submittedAt),
          eq(questions.isActive, true)
        )
      )
      .groupBy(
        objects.id,
        objects.name,
        objects.type,
        gaStaff.name,
        questions.id,
        questions.text,
        questions.category
      )
      .orderBy((t) => sql`AVG(${evaluationScores.score}) ASC`)

    const questionMap = new Map<string, {
      objectId: string
      objectName: string
      objectType: string
      gaName: string
      questions: Array<{
        questionId: string
        questionText: string
        category: string
        avgScore: number
        responseCount: number
      }>
      lowestScore: number
    }>()

    for (const row of questionScores as any) {
      const avgScore = row.avgScore ? parseFloat(row.avgScore) : 0
      if (avgScore >= 3) continue
      const responseCount = row.responseCount ? parseInt(row.responseCount) : 0
      const existing = questionMap.get(row.objectId)

      if (!existing) {
        questionMap.set(row.objectId, {
          objectId: row.objectId,
          objectName: row.objectName,
          objectType: row.objectType,
          gaName: row.gaName,
          questions: [{
            questionId: row.questionId,
            questionText: row.questionText,
            category: row.category,
            avgScore,
            responseCount,
          }],
          lowestScore: avgScore,
        })
      } else {
        existing.questions.push({
          questionId: row.questionId,
          questionText: row.questionText,
          category: row.category,
          avgScore,
          responseCount,
        })
        existing.lowestScore = Math.min(existing.lowestScore, avgScore)
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
        questions: item.questions
          .sort((a, b) => a.avgScore - b.avgScore)
          .slice(0, 5),
      }))

    // 3. Critical feedback (score ≤ 2)
    const criticalFeedback = await db
      .select({
        scoreId: evaluationScores.id,
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
      .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
      .where(
        and(
          inArray(evaluationForms.periodId, resolvedPeriodIds),
          isNotNull(evaluationForms.submittedAt),
          lte(evaluationScores.score, 2),
          isNotNull(evaluationScores.comment),
          sql`trim(${evaluationScores.comment}) <> ''`
        )
      )
      .orderBy((t) => evaluationForms.createdAt)
      .limit(10)

    const criticalFeedbackData = criticalFeedback.map((cf) => ({
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
