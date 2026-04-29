// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    await requireRole('admin', 'superadmin')

    const rows = await db.query.settings.findMany()
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Unauthorized or Server Error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole('admin', 'superadmin')

    const body = await request.json()

    // Validasi threshold (0-100)
    if (body.threshold !== undefined) {
      const t = parseFloat(body.threshold)
      if (isNaN(t) || t < 0 || t > 100) {
        return NextResponse.json(
          { error: 'Threshold must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Validasi weights (jika ada, harus sum to 1.0)
    const weights = {
      facility_quality: body.weight_facility_quality !== undefined
        ? parseFloat(body.weight_facility_quality)
        : undefined,
      service_performance: body.weight_service_performance !== undefined
        ? parseFloat(body.weight_service_performance)
        : undefined,
      user_satisfaction: body.weight_user_satisfaction !== undefined
        ? parseFloat(body.weight_user_satisfaction)
        : undefined,
    }

    // Jika ada salah satu weight, validasi semua
    const hasWeights = Object.values(weights).some(v => v !== undefined)
    if (hasWeights) {
      // Ambil weights dari DB yang belum diupdate
      const dbRows = await db.query.settings.findMany()
      const dbSettings: Record<string, number> = {}
      for (const row of dbRows) {
        if (row.key.startsWith('weight_')) {
          dbSettings[row.key] = parseFloat(row.value)
        }
      }

      // Gabung dengan update values
      const finalWeights = {
        weight_facility_quality: weights.facility_quality ?? dbSettings.weight_facility_quality ?? 0.35,
        weight_service_performance: weights.service_performance ?? dbSettings.weight_service_performance ?? 0.40,
        weight_user_satisfaction: weights.user_satisfaction ?? dbSettings.weight_user_satisfaction ?? 0.25,
      }

      const sum = Object.values(finalWeights).reduce((a, b) => a + b, 0)
      const sumRounded = Math.round(sum * 10000) / 10000 // Round to 4 decimals to avoid floating point errors

      if (sumRounded !== 1.0) {
        return NextResponse.json(
          {
            error: `Weights must sum to 1.0, got ${sumRounded}`,
            weights: finalWeights,
            sum: sumRounded,
          },
          { status: 400 }
        )
      }
    }

    // Update settings
    const updates: Array<{ key: string; value: string }> = []

    if (body.threshold !== undefined) {
      updates.push({ key: 'threshold', value: String(body.threshold) })
    }
    if (body.weight_facility_quality !== undefined) {
      updates.push({ key: 'weight_facility_quality', value: String(body.weight_facility_quality) })
    }
    if (body.weight_service_performance !== undefined) {
      updates.push({ key: 'weight_service_performance', value: String(body.weight_service_performance) })
    }
    if (body.weight_user_satisfaction !== undefined) {
      updates.push({ key: 'weight_user_satisfaction', value: String(body.weight_user_satisfaction) })
    }
    if (body.odoo_ga_department_id !== undefined) {
      updates.push({ key: 'odoo_ga_department_id', value: String(body.odoo_ga_department_id) })
    }

    // Upsert each setting
    for (const update of updates) {
      await db.execute(
        sql`INSERT INTO settings (key, value, updated_at) VALUES (${update.key}, ${update.value}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${update.value}, updated_at = NOW()`
      )
    }

    // Return updated settings
    const rows = await db.query.settings.findMany()
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server Error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
