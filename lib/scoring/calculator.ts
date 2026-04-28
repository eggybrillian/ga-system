import { db } from '@/lib/db'
import { eq, and, isNull, avg, sql } from 'drizzle-orm'
import {
  evaluationScores,
  evaluationForms,
  questions,
  objects,
  gaStaff,
  evaluationPeriods,
} from '@/lib/db/schema'

export type CategoryWeights = {
  facility_quality: number
  service_performance: number
  user_satisfaction: number
}

const DEFAULT_WEIGHTS: CategoryWeights = {
  facility_quality: 0.35,
  service_performance: 0.4,
  user_satisfaction: 0.25,
}

// ============================================================
// SCORING CALCULATIONS
// ============================================================

/**
 * Hitung skor per kategori dari satu form evaluasi
 * Score_category = Σ(score × weight_pertanyaan) / Σ(weight_pertanyaan)
 */
export async function calculateCategoryScore(
  formId: string,
  category: 'facility_quality' | 'service_performance' | 'user_satisfaction'
): Promise<number | null> {
  const scores = await db
    .select({
      score: evaluationScores.score,
      weight: questions.weight,
    })
    .from(evaluationScores)
    .innerJoin(questions, eq(evaluationScores.questionId, questions.id))
    .where(
      and(
        eq(evaluationScores.formId, formId),
        eq(evaluationScores.category, category)
      )
    )

  if (scores.length === 0) return null

  const totalWeightedScore = scores.reduce(
    (sum, s) => sum + Number(s.score) * Number(s.weight),
    0
  )
  const totalWeight = scores.reduce((sum, s) => sum + Number(s.weight), 0)

  return totalWeightedScore / totalWeight
}

/**
 * Hitung skor final dari satu form evaluasi (sudah dinormalisasi ke skala 0-100)
 * Score_final = (Score_facility × 0.35) + (Score_service × 0.40) + (Score_satisfaction × 0.25)
 */
export async function calculateFormFinalScore(
  formId: string,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): Promise<number | null> {
  const categoryScores = {
    facility_quality: await calculateCategoryScore(formId, 'facility_quality'),
    service_performance: await calculateCategoryScore(formId, 'service_performance'),
    user_satisfaction: await calculateCategoryScore(formId, 'user_satisfaction'),
  }

  // Jika ada kategori yang tidak ada score, tidak bisa hitung final score
  if (Object.values(categoryScores).some(s => s === null)) {
    return null
  }

  // Normalisasi ke skala 0-100
  const normalizedScores = {
    facility_quality: (categoryScores.facility_quality! / 5) * 100,
    service_performance: (categoryScores.service_performance! / 5) * 100,
    user_satisfaction: (categoryScores.user_satisfaction! / 5) * 100,
  }

  const finalScore =
    normalizedScores.facility_quality * weights.facility_quality +
    normalizedScores.service_performance * weights.service_performance +
    normalizedScores.user_satisfaction * weights.user_satisfaction

  return finalScore
}

/**
 * Hitung skor per objek (rata-rata final score dari semua submissions)
 * Jika tidak ada submission → return null
 */
export async function calculateObjectScore(
  objectId: string,
  periodId: string,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): Promise<number | null> {
  const forms = await db
    .select({ id: evaluationForms.id })
    .from(evaluationForms)
    .where(
      and(
        eq(evaluationForms.objectId, objectId),
        eq(evaluationForms.periodId, periodId),
        eq(evaluationForms.isDraft, false),
        isNull(evaluationForms.submittedAt)
      )
    )

  if (forms.length === 0) return null

  const scores = await Promise.all(
    forms.map(form => calculateFormFinalScore(form.id, weights))
  )

  const validScores = scores.filter((s): s is number => s !== null)
  if (validScores.length === 0) return null

  return validScores.reduce((a, b) => a + b, 0) / validScores.length
}

/**
 * Hitung skor GA Staff (rata-rata skor dari semua objek yang dikelola)
 * B4: Skor GA dihitung ulang setiap ada submission baru
 */
export async function calculateGAScore(
  gaId: string,
  periodId: string,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): Promise<number | null> {
  // Ambil semua objek yang dikelola GA ini
  const gaObjects = await db
    .select({ id: objects.id })
    .from(objects)
    .where(eq(objects.picGaId, gaId))

  if (gaObjects.length === 0) return null

  // Hitung skor setiap objek
  const objectScores = await Promise.all(
    gaObjects.map(obj => calculateObjectScore(obj.id, periodId, weights))
  )

  // Filter hanya objek yang punya score (tidak null)
  const validScores = objectScores.filter((s): s is number => s !== null)

  if (validScores.length === 0) return null

  // Rata-rata skor GA
  return validScores.reduce((a, b) => a + b, 0) / validScores.length
}

/**
 * Trigger kalkulasi ulang skor GA untuk periode tertentu
 * Dijalankan setelah ada submission evaluasi baru
 */
export async function recalculateGAScoresForPeriod(
  periodId: string,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): Promise<void> {
  const gaStaffs = await db.select({ id: gaStaff.id }).from(gaStaff)

  for (const staff of gaStaffs) {
    await calculateGAScore(staff.id, periodId, weights)
  }
}

/**
 * Format skor untuk display
 */
export function formatScore(score: number | null): string {
  if (score === null) return '—'
  return score.toFixed(2)
}

/**
 * Tentukan status berdasarkan skor (default threshold 60)
 */
export function getScoreStatus(
  score: number | null,
  threshold: number = 60
): 'excellent' | 'good' | 'fair' | 'poor' | 'no_data' {
  if (score === null) return 'no_data'
  if (score >= 80) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= threshold) return 'fair'
  return 'poor'
}

/**
 * Ambil skor GA dan feedback critical (skor ≤ 2)
 * Untuk notifikasi dan dashboard
 */
export async function getGACriticalFeedback(
  gaId: string,
  periodId: string,
  limit: number = 10
) {
  const criticalFeedback = await db
    .select({
      objectName: objects.name,
      userName: (await import('@/lib/db/schema')).users.name,
      score: evaluationScores.score,
      comment: evaluationScores.comment,
      submittedAt: evaluationForms.submittedAt,
    })
    .from(evaluationScores)
    .innerJoin(evaluationForms, eq(evaluationScores.formId, evaluationForms.id))
    .innerJoin(objects, eq(evaluationForms.objectId, objects.id))
    .innerJoin((await import('@/lib/db/schema')).users, eq(evaluationForms.userId, (await import('@/lib/db/schema')).users.id))
    .where(
      and(
        eq(objects.picGaId, gaId),
        eq(evaluationForms.periodId, periodId),
        eq(evaluationForms.isDraft, false),
        sql`${evaluationScores.score} <= 2`
      )
    )
    .limit(limit)

  return criticalFeedback
}
