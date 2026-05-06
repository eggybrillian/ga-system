import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { getGAReportData } from '@/lib/reports/ga-report'
import { generateExcelReport } from '@/lib/reports/excel'

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')

    const body = await req.json().catch(() => ({}))
    const periodIds = (body?.periodIds as string[] | undefined) ?? []
    const report = await getGAReportData(periodIds.length > 0 ? periodIds : null)
    const buffer = await generateExcelReport(report)
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ga-report-${report.period?.label?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'report'}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/reports/export error:', error)
    return Response.json({ error: 'Gagal export laporan' }, { status: 500 })
  }
}
