// lib/scoring/calculator.ts
import { db } from '@/lib/db'
import {
  evaluationForms,
  evaluationScores,
  evaluationPeriods,
  objects,
  gaStaff,
  questions,
} from '@/lib/db/schema'
import { eq, and, isNotNull } from 'drizzle-orm'

// Bobot kategori default (bisa di-override dari settings)
export const DEFAULT_WEIGHTS = {
  facility_quality:    0.35,
  service_performance: 0.40,
  user_satisfaction:   0.25,
}

export type CategoryWeights = typeof DEFAULT_WEIGHTS

export type ObjectScore = {
  objectId:   string
  objectName: string
  objectType: string
  scores: {
    facility_quality:    number | null
    service_performance: number | null
    user_satisfaction:   number | null
    final:               number | null
  }
  submissionCount: number
}

export type GAScore = {
  gaId:         string
  gaName:       string
  gaNik:        string
  objectScores: ObjectScore[]
  finalScore:   number | null  // null jika belum ada submission sama sekali
  isBelow:      boolean
}

/**
 * Hitung skor per kategori untuk satu objek di satu periode.
 * Score_category = Σ(score × weight) / Σ(weight)
 */
function calcCategoryScore(
  scoreRows: { score: number; weight: string }[]
): number | null {
  if (!scoreRows.length) return null
  let numerator   = 0
  let denominator = 0
  for (const row of scoreRows) {
    const w = parseFloat(row.weight)
    numerator   += row.score * w
    denominator += w
  }
  return denominator === 0 ? null : numerator / denominator
}

/**
 * Hitung skor final satu objek dari 3 kategori.
 * Score_final = (facility × 0.35) + (service × 0.40) + (satisfaction × 0.25)
 * Jika salah satu kategori null → tetap dihitung dari kategori yang ada
 * (proporsional terhadap bobot yang tersedia)
 */
function calcFinalScore(
  categoryScores: Record<string, number | null>,
  weights: CategoryWeights
): number | null {
  let numerator   = 0
  let denominator = 0
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score === null) continue
    const w = weights[cat as keyof CategoryWeights] ?? 0
    numerator   += score * w
    denominator += w
  }
  return denominator === 0 ? null : numerator / denominator
}

/**
 * Ambil dan hitung semua skor GA untuk periode tertentu.
 */
export async function calcGAScores(
  periodId: string,
  weights: CategoryWeights = DEFAULT_WEIGHTS,
  threshold = 60
): Promise<GAScore[]> {
  // Ambil semua form yang sudah disubmit (bukan draft) di periode ini
  const forms = await db.query.evaluationForms.findMany({
    where: and(
      eq(evaluationForms.periodId, periodId),
      eq(evaluationForms.isDraft, false),
      isNotNull(evaluationForms.submittedAt),
    ),
    with: {
      scores: {
        with: { question: true },
      },
      object: {
        with: { picGa: true },
      },
    },
  })

  // Kelompokkan form per objek
  const byObject = new Map<string, typeof forms>()
  for (const form of forms) {
    const key = form.objectId
    if (!byObject.has(key)) byObject.set(key, [])
    byObject.get(key)!.push(form)
  }

  // Ambil semua GA staff aktif beserta objek yang mereka kelola
  const allGA = await db.query.gaStaff.findMany({
    where: eq(gaStaff.isActive, true),
    with: { objects: { where: eq(objects.isDeleted, false) } },
  })

  const result: GAScore[] = []

  for (const ga of allGA) {
    const objectScores: ObjectScore[] = []

    for (const obj of ga.objects) {
      const objForms = byObject.get(obj.id) ?? []

      if (objForms.length === 0) {
        // Tidak ada submission → skor null (B9: tidak dihitung sebagai 0)
        objectScores.push({
          objectId:        obj.id,
          objectName:      obj.name,
          objectType:      obj.type,
          scores:          { facility_quality: null, service_performance: null, user_satisfaction: null, final: null },
          submissionCount: 0,
        })
        continue
      }

      // Kumpulkan semua score rows per kategori dari semua form objek ini
      const byCategory: Record<string, { score: number; weight: string }[]> = {
        facility_quality:    [],
        service_performance: [],
        user_satisfaction:   [],
      }

      for (const form of objForms) {
        for (const s of form.scores) {
          const cat = s.category
          if (byCategory[cat]) {
            byCategory[cat].push({ score: s.score, weight: s.question.weight })
          }
        }
      }

      const catScores = {
        facility_quality:    calcCategoryScore(byCategory.facility_quality),
        service_performance: calcCategoryScore(byCategory.service_performance),
        user_satisfaction:   calcCategoryScore(byCategory.user_satisfaction),
      }

      const finalScore = calcFinalScore(catScores, weights)

      objectScores.push({
        objectId:        obj.id,
        objectName:      obj.name,
        objectType:      obj.type,
        scores:          { ...catScores, final: finalScore },
        submissionCount: objForms.length,
      })
    }

    // Skor GA = rata-rata final score dari objek yang ada submission
    const scored = objectScores.filter(o => o.scores.final !== null)
    const gaFinal = scored.length === 0
      ? null
      : scored.reduce((sum, o) => sum + o.scores.final!, 0) / scored.length

    // Konversi ke skala 0–100
    const gaScore100 = gaFinal !== null ? (gaFinal / 5) * 100 : null

    result.push({
      gaId:         ga.id,
      gaName:       ga.name,
      gaNik:        ga.nik,
      objectScores,
      finalScore:   gaScore100 !== null ? Math.round(gaScore100 * 10) / 10 : null,
      isBelow:      gaScore100 !== null && gaScore100 < threshold,
    })
  }

  // Urutkan: yang ada skor dulu (descending), yang null di bawah
  result.sort((a, b) => {
    if (a.finalScore === null && b.finalScore === null) return 0
    if (a.finalScore === null) return 1
    if (b.finalScore === null) return -1
    return b.finalScore - a.finalScore
  })

  return result
}

/**
 * Hitung ulang dan return skor GA (untuk dipanggil setelah submit evaluasi).
 */
export async function getActivePeriodScores(
  weights = DEFAULT_WEIGHTS,
  threshold = 60
) {
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.status, 'open'),
  })
  if (!period) return { period: null, gaScores: [] }

  const gaScores = await calcGAScores(period.id, weights, threshold)
  return { period, gaScores }
}