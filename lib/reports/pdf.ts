import type { GAReportData } from './ga-report'

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function getThresholdColor(score: number | null, threshold: number): { r: number; g: number; b: number } {
  if (score === null) return { r: 255, g: 255, b: 255 }
  if (score < threshold) return { r: 255, g: 107, b: 107 } // Red
  if (score < 75) return { r: 255, g: 193, b: 7 } // Yellow
  return { r: 76, g: 175, b: 80 } // Green
}

interface TableCell {
  text: string
  width: number
  align?: 'left' | 'center' | 'right'
}

interface TableRow {
  cells: (string | number)[]
  isHeader?: boolean
  bgColor?: { r: number; g: number; b: number }
}

function drawTable(
  doc: any,
  rows: TableRow[],
  columnWidths: number[],
  y: number
): number {
  const cellHeight = 20
  const padding = 8
  const pageWidth = doc.page.width - doc.margins.left - doc.margins.right

  let currentY = y

  rows.forEach((row, rowIndex) => {
    let currentX = doc.page.margins.left
    const isHeader = row.isHeader ?? false
    const bgColor = row.bgColor

    // Draw background
    if (bgColor || isHeader) {
      const color = bgColor || { r: 31, g: 41, b: 55 }
      doc.rect(
        doc.page.margins.left,
        currentY,
        pageWidth,
        cellHeight
      )
        .fillAndStroke(
          { r: color.r / 255, g: color.g / 255, b: color.b / 255 },
          { r: 0.8, g: 0.8, b: 0.8 }
        )
    }

    // Draw cells
    row.cells.forEach((cell, cellIndex) => {
      const width = columnWidths[cellIndex] || 50
      const text = String(cell)

      // Set font
      if (isHeader) {
        doc.font('Helvetica-Bold').fontSize(10).fill(255, 255, 255)
      } else {
        doc.font('Helvetica').fontSize(9).fill(0, 0, 0)
      }

      // Draw text
      doc.text(text, currentX + padding, currentY + padding, {
        width: width - padding * 2,
        align: cellIndex === 0 ? 'left' : 'center',
        ellipsis: true,
      })

      currentX += width
    })

    // Draw horizontal line
    doc.moveTo(doc.page.margins.left, currentY + cellHeight)
      .lineTo(doc.page.margins.left + pageWidth, currentY + cellHeight)
      .stroke()

    currentY += cellHeight
  })

  return currentY
}

export async function generatePdfReport(reportData: GAReportData): Promise<Buffer> {
  const PDFDocument = require('pdfkit') as any
  const doc = new PDFDocument({ margin: 36, size: 'A4' })

  const bufferPromise = streamToBuffer(doc)

  // Title page
  doc.fontSize(28).font('Helvetica-Bold').text('Laporan Evaluasi GA', { align: 'center' })
  doc.moveDown(1)
  doc.fontSize(14).font('Helvetica').text(`Periode: ${reportData.period?.label ?? 'Tidak ada periode'}`, {
    align: 'center',
  })
  doc.text(`Threshold: ${reportData.threshold}%`, { align: 'center' })
  doc.moveDown(2)
  doc.fontSize(11).text(
    `Total GA Staff: ${reportData.stats.gaTotal} | Terskor: ${reportData.stats.gaScored} | Di Bawah Threshold: ${reportData.stats.gaBelow}`,
    { align: 'center' }
  )
  doc.moveDown(1)
  doc.fontSize(10).text(`Tanggal: ${new Date().toLocaleString('id-ID')}`, { align: 'center' })

  // Add page break
  doc.addPage()

  // GA Summary section
  doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan GA Staff', { underline: true })
  doc.moveDown(0.5)

  const gaRows: TableRow[] = [
    {
      cells: ['No', 'GA Staff', 'NIK', 'Objek', 'Skor Final', 'Status'],
      isHeader: true,
    },
    ...reportData.gaScores.map((ga, index) => ({
      cells: [
        index + 1,
        ga.gaName,
        ga.gaNik,
        ga.objectScores.length,
        ga.finalScore !== null ? ga.finalScore.toFixed(1) : 'N/A',
        ga.isBelow ? 'Di Bawah' : 'Normal',
      ],
      bgColor: ga.finalScore !== null ? getThresholdColor(ga.finalScore, reportData.threshold) : undefined,
    })),
  ]

  let currentY = doc.y
  currentY = drawTable(doc, gaRows, [30, 100, 70, 50, 70, 70], currentY)
  doc.y = currentY + 10

  // Add page break if needed
  if (doc.y > doc.page.height - 150) {
    doc.addPage()
  }

  // Object Results section
  doc.fontSize(14).font('Helvetica-Bold').text('Hasil Evaluasi Objek', { underline: true })
  doc.moveDown(0.5)

  const objRows: TableRow[] = [
    {
      cells: ['GA Staff', 'Objek', 'Tipe', 'Submisi', 'Facility Quality', 'Service Performance', 'User Satisfaction', 'Final Score'],
      isHeader: true,
    },
    ...reportData.objects.slice(0, 15).map((obj) => ({
      cells: [
        obj.gaName,
        obj.objectName.substring(0, 15),
        obj.objectType,
        obj.submissionCount,
        obj.scores.facility_quality !== null ? obj.scores.facility_quality.toFixed(1) : 'N/A',
        obj.scores.service_performance !== null ? obj.scores.service_performance.toFixed(1) : 'N/A',
        obj.scores.user_satisfaction !== null ? obj.scores.user_satisfaction.toFixed(1) : 'N/A',
        obj.scores.final !== null ? obj.scores.final.toFixed(1) : 'N/A',
      ],
      bgColor: obj.scores.final !== null ? getThresholdColor(obj.scores.final, reportData.threshold) : undefined,
    })),
  ]

  currentY = doc.y
  currentY = drawTable(doc, objRows, [60, 60, 45, 40, 55, 55, 55, 55], currentY)
  doc.y = currentY + 10

  if (reportData.objects.length > 15) {
    doc.fontSize(10).text(`... dan ${reportData.objects.length - 15} objek lainnya`, { style: 'italic' })
  }

  // Add page break for feedback
  if (doc.y > doc.page.height - 150) {
    doc.addPage()
  }

  // Critical Feedback section
  doc.fontSize(14).font('Helvetica-Bold').text('Critical Feedback (Skor ≤ 2)', { underline: true })
  doc.moveDown(0.5)

  if (reportData.criticalFeedback.length === 0) {
    doc.fontSize(10).font('Helvetica').text('Tidak ada feedback kritis.', { style: 'italic' })
  } else {
    const fbRows: TableRow[] = [
      {
        cells: ['Objek', 'Pertanyaan', 'Kategori', 'Skor', 'Komentar'],
        isHeader: true,
      },
      ...reportData.criticalFeedback.slice(0, 10).map((fb) => ({
        cells: [
          fb.objectName.substring(0, 15),
          fb.questionText.substring(0, 20),
          fb.category,
          fb.score,
          fb.comment ? fb.comment.substring(0, 20) : '-',
        ],
        bgColor: getThresholdColor(fb.score, 3),
      })),
    ]

    currentY = doc.y
    drawTable(doc, fbRows, [60, 80, 60, 40, 80], currentY)

    if (reportData.criticalFeedback.length > 10) {
      doc.fontSize(10).text(`... dan ${reportData.criticalFeedback.length - 10} feedback lainnya`, { style: 'italic' })
    }
  }

  // Footer
  doc.fontSize(8)
    .fill(128, 128, 128)
    .text(`Laporan ini dibuat otomatis pada ${new Date().toLocaleString('id-ID')}`, {
      align: 'center',
      y: doc.page.height - 20,
    })

  doc.end()
  return bufferPromise
}
