// lib/db/schema/index.ts
// Semua tabel didefinisikan di satu file untuk menghindari circular import pada Drizzle relations.

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  text,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================
// ENUMS
// ============================================================

export const objectTypeEnum = pgEnum('object_type', [
  'mess',
  'office',
  'vehicle',
  'meeting_room',
])

export const periodTypeEnum = pgEnum('period_type', [
  'monthly',
  'event_based',
])

export const periodStatusEnum = pgEnum('period_status', [
  'open',
  'closed',
])

export const categoryEnum = pgEnum('category', [
  'facility_quality',
  'service_performance',
  'user_satisfaction',
])

export const recipientTypeEnum = pgEnum('recipient_type', [
  'ga_staff',
  'admin',
])

export const notificationTriggerEnum = pgEnum('notification_trigger', [
  'below_threshold',
  'new_critical_feedback',
  'period_closing_soon',
  'period_opened',
  'escalation_to_superior',
])

export const syncStatusEnum = pgEnum('sync_status', [
  'success',
  'partial',
  'failed',
])

// ============================================================
// USERS (penilai — data dari Odoo, read-only)
// ============================================================

export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           varchar('name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }),
  nik:            varchar('nik', { length: 50 }).notNull().unique(),
  department:     varchar('department', { length: 255 }),
  odooEmployeeId: varchar('odoo_employee_id', { length: 100 }),
  isActive:       boolean('is_active').default(true).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

// ============================================================
// GA STAFF (PIC — data dari Odoo, read-only)
// ============================================================

export const gaStaff = pgTable('ga_staff', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           varchar('name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }),
  nik:            varchar('nik', { length: 50 }).notNull().unique(),
  position:       varchar('position', { length: 255 }),
  odooEmployeeId: varchar('odoo_employee_id', { length: 100 }).unique(),
  isActive:       boolean('is_active').default(true).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

// ============================================================
// ADMIN FLAGS (dikelola manual, terpisah dari Odoo)
// ============================================================

export const adminFlags = pgTable('admin_flags', {
  id:             uuid('id').primaryKey().defaultRandom(),
  // Referensi ke users.id atau ga_staff.id — disimpan sebagai string nik untuk fleksibilitas
  nik:            varchar('nik', { length: 50 }).notNull().unique(),
  employeeName:   varchar('employee_name', { length: 255 }).notNull(), // cache nama
  role:           varchar('role', { length: 50 }).notNull().default('admin'), // 'admin' | 'superadmin'
  grantedBy:      varchar('granted_by', { length: 50 }), // nik superadmin yang memberi
  grantedAt:      timestamp('granted_at').defaultNow().notNull(),
  isActive:       boolean('is_active').default(true).notNull(),
})

// ============================================================
// OBJECTS (fasilitas yang dievaluasi)
// ============================================================

export const objects = pgTable('objects', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 255 }).notNull(),
  type:      objectTypeEnum('type').notNull(),
  picGaId:   uuid('pic_ga_id').references(() => gaStaff.id, { onDelete: 'set null' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Many-to-many: user yang berhak menilai suatu objek
export const objectUserAssignments = pgTable('object_user_assignments', {
  id:       uuid('id').primaryKey().defaultRandom(),
  objectId: uuid('object_id').notNull().references(() => objects.id, { onDelete: 'cascade' }),
  userId:   uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueAssignment: unique().on(t.objectId, t.userId),
}))

// ============================================================
// EVALUATION PERIODS
// ============================================================

export const evaluationPeriods = pgTable('evaluation_periods', {
  id:        uuid('id').primaryKey().defaultRandom(),
  label:     varchar('label', { length: 100 }).notNull(), // e.g. "April 2025"
  type:      periodTypeEnum('type').notNull().default('monthly'),
  startDate: timestamp('start_date').notNull(),
  endDate:   timestamp('end_date').notNull(),
  status:    periodStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ============================================================
// QUESTIONS (bank pertanyaan, per tipe objek & kategori)
// ============================================================

export const questions = pgTable('questions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  objectType: objectTypeEnum('object_type').notNull(),
  category:   categoryEnum('category').notNull(),
  text:       varchar('text', { length: 500 }).notNull(),
  weight:     decimal('weight', { precision: 4, scale: 2 }).notNull().default('1.00'),
  isActive:   boolean('is_active').default(true).notNull(),
  sortOrder:  integer('sort_order').default(0).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

// ============================================================
// EVALUATION FORMS (satu per user per objek per periode)
// ============================================================

export const evaluationForms = pgTable('evaluation_forms', {
  id:          uuid('id').primaryKey().defaultRandom(),
  objectId:    uuid('object_id').notNull().references(() => objects.id),
  userId:      uuid('user_id').notNull().references(() => users.id),
  periodId:    uuid('period_id').notNull().references(() => evaluationPeriods.id),
  isDraft:     boolean('is_draft').default(true).notNull(),
  submittedAt: timestamp('submitted_at'),
  archiveYear: integer('archive_year'), // untuk soft archive tahunan
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  // B1: satu user hanya bisa submit 1 evaluasi per objek per periode
  uniqueSubmission: unique().on(t.objectId, t.userId, t.periodId),
}))

// ============================================================
// EVALUATION SCORES (jawaban per pertanyaan)
// ============================================================

export const evaluationScores = pgTable('evaluation_scores', {
  id:         uuid('id').primaryKey().defaultRandom(),
  formId:     uuid('form_id').notNull().references(() => evaluationForms.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  category:   categoryEnum('category').notNull(),
  score:      integer('score').notNull(), // 1–5
  comment:    varchar('comment', { length: 500 }),
})

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable('notifications', {
  id:            uuid('id').primaryKey().defaultRandom(),
  recipientType: recipientTypeEnum('recipient_type').notNull(),
  recipientId:   uuid('recipient_id').notNull(), // id di tabel ga_staff atau users
  message:       text('message').notNull(),
  trigger:       notificationTriggerEnum('trigger').notNull(),
  isRead:        boolean('is_read').default(false).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// SYNC LOGS (log sinkronisasi Odoo)
// ============================================================

export const syncLogs = pgTable('sync_logs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  triggeredBy:      varchar('triggered_by', { length: 50 }).notNull(), // 'cron' | 'manual'
  status:           syncStatusEnum('status').notNull(),
  recordsUpserted:  integer('records_upserted').default(0),
  errorMessage:     text('error_message'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// RELATIONS
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  objectAssignments: many(objectUserAssignments),
  evaluationForms:   many(evaluationForms),
}))

export const gaStaffRelations = relations(gaStaff, ({ many }) => ({
  objects: many(objects),
}))

export const objectsRelations = relations(objects, ({ one, many }) => ({
  picGa:           one(gaStaff, { fields: [objects.picGaId], references: [gaStaff.id] }),
  userAssignments: many(objectUserAssignments),
  evaluationForms: many(evaluationForms),
}))

export const objectUserAssignmentsRelations = relations(objectUserAssignments, ({ one }) => ({
  object: one(objects, { fields: [objectUserAssignments.objectId], references: [objects.id] }),
  user:   one(users,   { fields: [objectUserAssignments.userId],   references: [users.id] }),
}))

export const evaluationPeriodsRelations = relations(evaluationPeriods, ({ many }) => ({
  evaluationForms: many(evaluationForms),
}))

export const questionsRelations = relations(questions, ({ many }) => ({
  scores: many(evaluationScores),
}))

export const evaluationFormsRelations = relations(evaluationForms, ({ one, many }) => ({
  object:  one(objects,           { fields: [evaluationForms.objectId],  references: [objects.id] }),
  user:    one(users,             { fields: [evaluationForms.userId],     references: [users.id] }),
  period:  one(evaluationPeriods, { fields: [evaluationForms.periodId],   references: [evaluationPeriods.id] }),
  scores:  many(evaluationScores),
}))

export const evaluationScoresRelations = relations(evaluationScores, ({ one }) => ({
  form:     one(evaluationForms, { fields: [evaluationScores.formId],     references: [evaluationForms.id] }),
  question: one(questions,       { fields: [evaluationScores.questionId], references: [questions.id] }),
}))

// ============================================================
// TYPES
// ============================================================

export type User                   = typeof users.$inferSelect
export type NewUser                = typeof users.$inferInsert
export type GAStaff                = typeof gaStaff.$inferSelect
export type NewGAStaff             = typeof gaStaff.$inferInsert
export type AdminFlag              = typeof adminFlags.$inferSelect
export type NewAdminFlag           = typeof adminFlags.$inferInsert
export type ObjectFacility         = typeof objects.$inferSelect
export type NewObjectFacility      = typeof objects.$inferInsert
export type ObjectUserAssignment   = typeof objectUserAssignments.$inferSelect
export type EvaluationPeriod       = typeof evaluationPeriods.$inferSelect
export type NewEvaluationPeriod    = typeof evaluationPeriods.$inferInsert
export type Question               = typeof questions.$inferSelect
export type NewQuestion            = typeof questions.$inferInsert
export type EvaluationForm         = typeof evaluationForms.$inferSelect
export type NewEvaluationForm      = typeof evaluationForms.$inferInsert
export type EvaluationScore        = typeof evaluationScores.$inferSelect
export type NewEvaluationScore     = typeof evaluationScores.$inferInsert
export type Notification           = typeof notifications.$inferSelect
export type SyncLog                = typeof syncLogs.$inferSelect