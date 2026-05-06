import { NextResponse } from 'next/server'
import { getReportData } from '../../../../lib/reports/queries'
import { requireRole } from '../../../../lib/auth/session'

export async function GET(req: Request) {
  // requireRole will throw/redirect if unauthorized
  await requireRole('admin', 'superadmin')

  const url = new URL(req.url)
  const periodId = url.searchParams.get('periodId')
  const gaId = url.searchParams.get('gaId')
  const objectId = url.searchParams.get('objectId')
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')

  if (!periodId) {
    return NextResponse.json({ error: 'periodId is required' }, { status: 400 })
  }

  try {
    const data = await getReportData({ periodId, gaId, objectId, startDate, endDate })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('GET /api/admin/reports error', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
