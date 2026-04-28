import { z } from 'zod'

// ============================================================
// EVALUATION SUBMISSION & DRAFT
// ============================================================

export const evaluationScoreSchema = z.object({
  questionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export const submitEvaluationSchema = z.object({
  objectId: z.string().uuid(),
  periodId: z.string().uuid(),
  scores: z.array(evaluationScoreSchema).min(1, 'Minimal satu pertanyaan harus dijawab'),
})

export const updateEvaluationDraftSchema = z.object({
  scores: z.array(evaluationScoreSchema).min(1),
})

// ============================================================
// ADMIN: OBJECTS
// ============================================================

export const createObjectSchema = z.object({
  name: z.string().min(1, 'Nama objek wajib diisi').max(255),
  type: z.enum(['mess', 'office', 'vehicle', 'meeting_room']),
  picGaId: z.string().uuid('PIC GA wajib dipilih'),
  assignedUserIds: z.array(z.string().uuid()).optional().default([]),
})

export const updateObjectSchema = createObjectSchema.partial()

export const assignUsersToObjectSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Minimal satu user harus dipilih'),
  mode: z.enum(['add', 'replace']).default('replace'),
})

// ============================================================
// ADMIN: PERIODS
// ============================================================

export const createPeriodSchema = z.object({
  label: z.string().min(1, 'Label wajib diisi').max(100),
  type: z.enum(['monthly', 'event_based']).default('monthly'),
  startDate: z.string().datetime('Format tanggal tidak valid').transform(s => new Date(s)),
  endDate: z.string().datetime('Format tanggal tidak valid').transform(s => new Date(s)),
}).refine(
  data => data.startDate < data.endDate,
  { message: 'Tanggal mulai harus sebelum tanggal selesai', path: ['endDate'] }
)

export const updatePeriodSchema = createPeriodSchema.partial().extend({
  status: z.enum(['open', 'closed']).optional(),
})

// ============================================================
// ADMIN: QUESTIONS
// ============================================================

export const createQuestionSchema = z.object({
  objectType: z.enum(['mess', 'office', 'vehicle', 'meeting_room']),
  category: z.enum(['facility_quality', 'service_performance', 'user_satisfaction']),
  text: z.string().min(5, 'Pertanyaan minimal 5 karakter').max(500),
  weight: z.coerce.number().min(0.1).max(10).default(1),
  sortOrder: z.number().int().default(0),
})

export const updateQuestionSchema = createQuestionSchema.partial()

// ============================================================
// ADMIN: FLAGS & SETTINGS
// ============================================================

export const grantAdminFlagSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
  employeeName: z.string().min(1, 'Nama karyawan wajib diisi'),
  role: z.enum(['admin', 'superadmin']).default('admin'),
})

export const updateSettingsSchema = z.object({
  threshold: z.number().min(0).max(100).optional(),
  facilityQualityWeight: z.number().min(0).max(1).optional(),
  servicePerformanceWeight: z.number().min(0).max(1).optional(),
  userSatisfactionWeight: z.number().min(0).max(1).optional(),
}).refine(
  (data) => {
    const weights = [
      data.facilityQualityWeight,
      data.servicePerformanceWeight,
      data.userSatisfactionWeight,
    ].filter(w => w !== undefined)
    
    if (weights.length === 0) return true
    const sum = weights.reduce((a, b) => a + b, 0)
    return Math.abs(sum - 1) < 0.001
  },
  { message: 'Total bobot kategori harus sama dengan 1' }
)

// ============================================================
// TYPE EXPORTS
// ============================================================

export type EvaluationScore = z.infer<typeof evaluationScoreSchema>
export type SubmitEvaluation = z.infer<typeof submitEvaluationSchema>
export type UpdateEvaluationDraft = z.infer<typeof updateEvaluationDraftSchema>
export type CreateObject = z.infer<typeof createObjectSchema>
export type UpdateObject = z.infer<typeof updateObjectSchema>
export type CreatePeriod = z.infer<typeof createPeriodSchema>
export type UpdatePeriod = z.infer<typeof updatePeriodSchema>
export type CreateQuestion = z.infer<typeof createQuestionSchema>
export type UpdateQuestion = z.infer<typeof updateQuestionSchema>
export type GrantAdminFlag = z.infer<typeof grantAdminFlagSchema>
export type UpdateSettings = z.infer<typeof updateSettingsSchema>
