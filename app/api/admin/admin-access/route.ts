// app/api/admin/admin-access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { adminFlags, gaStaff, users } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { z } from 'zod'

const grantFlagSchema = z.object({
  nik: z.string().min(1, 'NIK harus diisi'),
  role: z.enum(['admin', 'superadmin']),
  employeeName: z.string().min(1, 'Nama harus diisi'),
})

type GrantFlagInput = z.infer<typeof grantFlagSchema>

export async function GET(request: NextRequest) {
  try {
    // Hanya superadmin yang bisa lihat admin flags
    await requireRole('superadmin')

    // Ambil semua admin flags yang aktif
    const flags = await db.query.adminFlags.findMany({
      orderBy: (f) => f.grantedAt,
    })

    // Untuk setiap flag, coba cari data user/GA staff terkait untuk info tambahan
    const flagsWithDetails = await Promise.all(
      flags.map(async (flag) => {
        // Cari di users atau ga_staff berdasarkan NIK
        const userRecord = await db.query.users.findFirst({
          where: eq(users.nik, flag.nik),
        })

        const gaStaffRecord = await db.query.gaStaff.findFirst({
          where: eq(gaStaff.nik, flag.nik),
        })

        return {
          id: flag.id,
          nik: flag.nik,
          employeeName: flag.employeeName,
          role: flag.role,
          grantedBy: flag.grantedBy,
          grantedAt: flag.grantedAt,
          isActive: flag.isActive,
          userType: userRecord ? 'user' : gaStaffRecord ? 'ga_staff' : 'unknown',
          email: userRecord?.email || gaStaffRecord?.email,
          department: userRecord?.department || gaStaffRecord?.position,
        }
      })
    )

    return NextResponse.json({ flags: flagsWithDetails })
  } catch (error) {
    console.error('GET /api/admin/admin-access error:', error)
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch admin flags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Hanya superadmin yang bisa membuat flag
    const session = await requireRole('superadmin')
    const body = await request.json()

    const { nik, role, employeeName } = grantFlagSchema.parse(body)

    // Cek apakah sudah ada flag untuk NIK ini
    const existingFlag = await db.query.adminFlags.findFirst({
      where: eq(adminFlags.nik, nik),
    })

    if (existingFlag) {
      return NextResponse.json(
        { error: 'Admin flag sudah ada untuk NIK ini' },
        { status: 400 }
      )
    }

    // Buat flag baru
    const newFlag = await db
      .insert(adminFlags)
      .values({
        nik,
        role,
        employeeName,
        grantedBy: session.nik,
        grantedAt: new Date(),
        isActive: true,
      })
      .returning()

    return NextResponse.json({ flag: newFlag[0] }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/admin-access error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.issues },
        { status: 400 }
      )
    }
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to create admin flag' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Hanya superadmin yang bisa update flag
    await requireRole('superadmin')
    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID harus diisi' },
        { status: 400 }
      )
    }

    const updated = await db
      .update(adminFlags)
      .set({ isActive: isActive ?? true })
      .where(eq(adminFlags.id, id))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Admin flag tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ flag: updated[0] })
  } catch (error) {
    console.error('PATCH /api/admin/admin-access error:', error)
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update admin flag' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Hanya superadmin yang bisa delete flag
    await requireRole('superadmin')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID harus diisi' },
        { status: 400 }
      )
    }

    const deleted = await db
      .delete(adminFlags)
      .where(eq(adminFlags.id, id))
      .returning()

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Admin flag tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Admin flag dihapus' })
  } catch (error) {
    console.error('DELETE /api/admin/admin-access error:', error)
    if ((error as Error).message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to delete admin flag' },
      { status: 500 }
    )
  }
}
