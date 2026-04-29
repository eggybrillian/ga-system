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
import { eq, and, isNotNull, lte, sql } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    // Get current active period
    const currentPeriod = await db.query.evaluationPeriods.findFirst({
      where: eq(evaluationPeriods.status, 'open'),
    })

    if (!currentPeriod) {
      return NextResponse.json({
        topLowestObjects: [],
        topLowestQuestions: [],
        criticalFeedback: [],
        categoryAverages: {},
      })
    }

    // 1. Top 5 objects with lowest average scores
    const objectScores = await db
      .select({
        objectId: objects.id,
        objectName: objects.name,
        objectType: objects.type,
        gaName: gaStaff.name,
        avgScore: sql<number>`AVG(${evaluationScores.score})`,
        submissionCount: sql<number>`COUNT(DISTINCT ${evaluationForms.id})`,
      })
      .from(objects)
      .innerJoin(gaStaff, eq(objects.picGaId, gaStaff.id))
      .innerJoin(evaluationForms, eq(objects.id, evaluationForms.objectId))
      .innerJoin(
        evaluationScores,
        eq(evaluationForms.id, evaluationScores.formId)
      )
      .where(
        and(
          eq(evaluationForms.periodId, currentPeriod.id),
          isNotNull(evaluationForms.submittedAt)
        )
      )
      .groupBy(objects.id, objects.name, objects.type, gaStaff.name)
      .orderBy((t) => sql`AVG(${evaluationScores.score}) ASC`)
      .limit(5)

    const topLowestObjects = (objectScores as any).map((o: any) => ({
      objectId: o.objectId,
      objectName: o.objectName,
      objectType: o.objectType,
      gaName: o.gaName,
      avgScore: o.avgScore ? Math.round((parseFloat(o.avgScore) / 5) * 1000) / 10 : 0,
      submissionCount: o.submissionCount ? parseInt(o.submissionCount) : 0,
    }))

    // 2. Top 5 questions with lowest average scores
    const questionScores = await db
      .select({
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
      .where(
        and(
          eq(evaluationForms.periodId, currentPeriod.id),
          isNotNull(evaluationForms.submittedAt),
          eq(questions.isActive, true)
        )
      )
      .groupBy(questions.id, questions.text, questions.category)
      .orderBy((t) => sql`AVG(${evaluationScores.score}) ASC`)
      .limit(5)

    const topLowestQuestions = (questionScores as any).map((q: any) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      category: q.category,
      avgScore: q.avgScore ? Math.round((parseFloat(q.avgScore) / 5) * 1000) / 10 : 0,
      responseCount: q.responseCount ? parseInt(q.responseCount) : 0,
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
          eq(evaluationForms.periodId, currentPeriod.id),
          isNotNull(evaluationForms.submittedAt),
          lte(evaluationScores.score, 2),
          isNotNull(evaluationScores.comment)
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

    // 4. Category averages for current period
    const categoryAverages = await db
      .select({
        category: evaluationScores.category,
        avgScore: sql<number>`AVG(${evaluationScores.score})`,
      })
      .from(evaluationScores)
      .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
      .where(
        and(
          eq(evaluationForms.periodId, currentPeriod.id),
          isNotNull(evaluationForms.submittedAt)
        )
      )
      .groupBy(evaluationScores.category)

    const categoryAvg: Record<string, number> = {}
    for (const ca of categoryAverages as any) {
      if (ca.avgScore) {
        categoryAvg[ca.category] = Math.round((parseFloat(ca.avgScore) / 5) * 1000) / 10
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
