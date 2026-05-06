export type ReportFilter = {
  periodId?: string
  gaId?: string | null
  objectId?: string | null
  startDate?: string | null // ISO
  endDate?: string | null // ISO
}

export type CategoryBreakdown = {
  facility_quality: number | null
  service_performance: number | null
  user_satisfaction: number | null
}

export type SummaryScore = {
  gaId: string
  gaName: string
  objectCount: number
  avgScore: number | null
  breakdown: CategoryBreakdown
  isBelowThreshold?: boolean
}

export type ObjectDetailScore = {
  objectId: string
  objectName: string
  picName?: string | null
  scores: CategoryBreakdown
  avgScore: number | null
  userCount: number
}

export type QuestionScore = {
  questionId: string
  questionText: string
  category: string
  objectType: string
  avgScore: number | null
  responseCount: number
}

export type FeedbackComment = {
  formId: string
  questionId: string
  questionText?: string
  score: number
  comment?: string | null
  userName?: string | null
  createdAt?: string | null
}

export type ReportData = {
  filters: ReportFilter
  summary: SummaryScore[]
  objects: ObjectDetailScore[]
  questions: QuestionScore[]
  comments: FeedbackComment[]
}
