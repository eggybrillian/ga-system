export const QUESTION_WEIGHT_OPTIONS = ['1', '1.5', '2'] as const

export type QuestionWeight = (typeof QUESTION_WEIGHT_OPTIONS)[number]

const QUESTION_WEIGHT_SET = new Set<string>(QUESTION_WEIGHT_OPTIONS)

export function normalizeQuestionWeight(value: unknown): QuestionWeight | null {
  if (typeof value === 'number') {
    return normalizeQuestionWeight(String(value))
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (normalized === '1.00') return '1'
  if (normalized === '1.50') return '1.5'
  if (normalized === '2.00') return '2'
  if (QUESTION_WEIGHT_SET.has(normalized)) return normalized as QuestionWeight

  return null
}