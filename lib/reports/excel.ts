import type { GAReportData } from './ga-report'

function getThresholdColor(score: number | null, threshold: number): string {
  if (score === null) return 'FFFFFF'
  if (score < threshold) return 'FF6B6B' // Red
  if (score < 75) return 'FFC107' // Yellow
  return '4CAF50' // Green
}

function toPercent(score: number | null) {
  return score === null ? null : (score / 5) * 100
}

function styleHeaderRow(row: any) {
  row.eachCell({ includeEmpty: false }, (cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
}

export async function generateExcelReport(reportData: GAReportData): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // ===== GA Summary Sheet =====
  const wsSummary = wb.addWorksheet('GA Summary')
  const summaryRows = reportData.gaScores.map((ga, index) => [
    index + 1,
    ga.gaName,
    ga.gaNik,
    ga.objectScores.length,
    ga.finalScore ?? '',
    ga.isBelow ? 'Di Bawah Threshold' : 'Normal',
  ])

  // Add header row with styling
  const headerRow = wsSummary.addRow(['Ranking', 'GA Staff', 'NIK', 'Objek Dikelola', 'Skor Final (100)', 'Status'])
  styleHeaderRow(headerRow)

  // Add data rows with threshold-based colors
  summaryRows.forEach((row) => {
    const dataRow = wsSummary.addRow(row)
    const score = row[4] as number | string
    if (typeof score === 'number') {
      const bgColor = getThresholdColor(score, reportData.threshold)
      dataRow.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bgColor}` },
      }
    }
  })

  // Set column widths
  wsSummary.columns = [
    { width: 10 },
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 18 },
  ]

  // Freeze panes at header row
  wsSummary.views = [{ state: 'frozen', ySplit: 1 }]

  // ===== Object Results Sheet =====
  const wsObjects = wb.addWorksheet('Object Results')
  const objectRows = reportData.objects.map((obj) => [
    obj.periodLabel,
    obj.gaName,
    obj.objectName,
    obj.objectType,
    obj.submissionCount,
    obj.scores.facility_quality ?? '',
    obj.scores.service_performance ?? '',
    obj.scores.user_satisfaction ?? '',
    obj.scores.final ?? '',
    toPercent(obj.scores.final) ?? '',
  ])

  const objHeaderRow = wsObjects.addRow([
    'Periode',
    'GA Staff',
    'Objek',
    'Tipe',
    'Submisi',
    'Facility Quality',
    'Service Performance',
    'User Satisfaction',
    'Score (1-5)',
    'Final Score (%)',
  ])
  styleHeaderRow(objHeaderRow)

  objectRows.forEach((row) => {
    const dataRow = wsObjects.addRow(row)
    const score = row[9] as number | string
    if (typeof score === 'number') {
      const bgColor = getThresholdColor(score, reportData.threshold)
      dataRow.getCell(10).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bgColor}` },
      }
    }
  })

  wsObjects.columns = [
    { width: 20 },
    { width: 22 },
    { width: 22 },
    { width: 15 },
    { width: 12 },
    { width: 18 },
    { width: 20 },
    { width: 18 },
    { width: 15 },
    { width: 15 },
  ]
  wsObjects.views = [{ state: 'frozen', ySplit: 1 }]

  // ===== Critical Feedback Sheet =====
  const wsFeedback = wb.addWorksheet('Critical Feedback')
  const feedbackRows = reportData.criticalFeedback.map((fb) => [
    fb.periodLabel,
    fb.createdAt ?? '',
    fb.evaluatorName,
    fb.objectName,
    fb.questionText,
    fb.category,
    fb.score,
    fb.comment ?? '',
  ])

  const fbHeaderRow = wsFeedback.addRow(['Periode', 'Tanggal', 'Nama Evaluator', 'Objek', 'Pertanyaan', 'Kategori', 'Skor', 'Komentar'])
  styleHeaderRow(fbHeaderRow)

  feedbackRows.forEach((row) => {
    const dataRow = wsFeedback.addRow(row)
    const score = row[6] as number
    const bgColor = getThresholdColor(score, 3) // Anything <= 2 is red, < 3 is flagged
    dataRow.getCell(7).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${bgColor}` },
    }
  })

  wsFeedback.columns = [
    { width: 18 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 40 },
    { width: 15 },
    { width: 8 },
    { width: 40 },
  ]
  wsFeedback.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
