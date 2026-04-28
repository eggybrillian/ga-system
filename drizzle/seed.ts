// drizzle/seed.ts
// Jalankan dengan: npx tsx drizzle/seed.ts

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../lib/db/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

async function main() {
  console.log('🌱 Seeding database...')

  // ── USERS ──────────────────────────────────────────────────
  console.log('  → users')
  const [u1, u2, u3, u4, u5] = await db
    .insert(schema.users)
    .values([
      { name: 'Andi Pratama',   nik: 'U001', email: 'andi@company.com',   department: 'Engineering' },
      { name: 'Rina Susanti',   nik: 'U002', email: 'rina@company.com',   department: 'Finance' },
      { name: 'Deni Kurniawan', nik: 'U003', email: 'deni@company.com',   department: 'Operations' },
      { name: 'Sari Melati',    nik: 'U004', email: 'sari@company.com',   department: 'HR' },
      { name: 'Bowo Santoso',   nik: 'U005', email: 'bowo@company.com',   department: 'Engineering' },
    ])
    .returning()

  // ── GA STAFF ────────────────────────────────────────────────
  console.log('  → ga_staff')
  const [g1, g2, g3] = await db
    .insert(schema.gaStaff)
    .values([
      { name: 'Hendra Wijaya',   nik: 'G001', email: 'hendra@company.com', position: 'GA Officer' },
      { name: 'Fitri Handayani', nik: 'G002', email: 'fitri@company.com',  position: 'GA Officer' },
      { name: 'Agus Salim',      nik: 'G003', email: 'agus@company.com',   position: 'GA Officer' },
    ])
    .returning()

  // ── ADMIN (masuk ga_staff, ditandai via admin_flags) ───────
  console.log('  → ga_staff (admin)')
  await db.insert(schema.gaStaff).values([
    { name: 'Budi Santoso', nik: 'A001', email: 'budi@company.com', position: 'GA Manager' },
    { name: 'Dewi Rahayu',  nik: 'A002', email: 'dewi@company.com', position: 'GA Manager' },
  ])

  console.log('  → admin_flags')
  await db.insert(schema.adminFlags).values([
    { nik: 'A001', employeeName: 'Budi Santoso', role: 'superadmin', grantedBy: 'system' },
    { nik: 'A002', employeeName: 'Dewi Rahayu',  role: 'admin',      grantedBy: 'A001' },
  ])

  // ── OBJECTS ────────────────────────────────────────────────
  console.log('  → objects')
  const [messA, messB, officeL1, officeL2, meetingMain, vehiclePool] = await db
    .insert(schema.objects)
    .values([
      { name: 'Mess Block A',        type: 'mess',         picGaId: g1.id },
      { name: 'Mess Block B',        type: 'mess',         picGaId: g2.id },
      { name: 'Office Lantai 1',     type: 'office',       picGaId: g1.id },
      { name: 'Office Lantai 2',     type: 'office',       picGaId: g3.id },
      { name: 'Meeting Room Utama',  type: 'meeting_room', picGaId: g3.id },
      { name: 'Kendaraan Pool',      type: 'vehicle',      picGaId: g2.id },
    ])
    .returning()

  // ── OBJECT USER ASSIGNMENTS ────────────────────────────────
  console.log('  → object_user_assignments')
  await db.insert(schema.objectUserAssignments).values([
    // Mess Block A → Andi, Bowo
    { objectId: messA.id,       userId: u1.id },
    { objectId: messA.id,       userId: u5.id },
    // Mess Block B → Deni, Sari
    { objectId: messB.id,       userId: u3.id },
    { objectId: messB.id,       userId: u4.id },
    // Office Lt.1 → Andi, Rina, Sari
    { objectId: officeL1.id,    userId: u1.id },
    { objectId: officeL1.id,    userId: u2.id },
    { objectId: officeL1.id,    userId: u4.id },
    // Office Lt.2 → Deni, Bowo
    { objectId: officeL2.id,    userId: u3.id },
    { objectId: officeL2.id,    userId: u5.id },
    // Meeting Room → semua user
    { objectId: meetingMain.id, userId: u1.id },
    { objectId: meetingMain.id, userId: u2.id },
    { objectId: meetingMain.id, userId: u3.id },
    { objectId: meetingMain.id, userId: u4.id },
    { objectId: meetingMain.id, userId: u5.id },
    // Kendaraan Pool → Andi, Deni
    { objectId: vehiclePool.id, userId: u1.id },
    { objectId: vehiclePool.id, userId: u3.id },
  ])

  // ── EVALUATION PERIODS ─────────────────────────────────────
  console.log('  → evaluation_periods')
  const [periodApr, periodMei] = await db
    .insert(schema.evaluationPeriods)
    .values([
      {
        label:     'April 2025',
        type:      'monthly',
        startDate: new Date('2025-04-01'),
        endDate:   new Date('2025-04-30'),
        status:    'closed',
      },
      {
        label:     'Mei 2025',
        type:      'monthly',
        startDate: new Date('2025-05-01'),
        endDate:   new Date('2025-05-31'),
        status:    'open',
      },
    ])
    .returning()

  // ── QUESTIONS ──────────────────────────────────────────────
  console.log('  → questions')
  await db.insert(schema.questions).values([
    // ── MESS ──
    { objectType: 'mess', category: 'facility_quality',   text: 'Kebersihan kamar dan area bersama',       weight: '1.0', sortOrder: 1 },
    { objectType: 'mess', category: 'facility_quality',   text: 'Ketersediaan air dan listrik',            weight: '1.0', sortOrder: 2 },
    { objectType: 'mess', category: 'service_performance',text: 'Kecepatan respon laporan kerusakan',      weight: '1.5', sortOrder: 1 },
    { objectType: 'mess', category: 'service_performance',text: 'Sikap dan keramahan petugas GA',          weight: '1.0', sortOrder: 2 },
    { objectType: 'mess', category: 'user_satisfaction',  text: 'Kepuasan keseluruhan terhadap fasilitas mess', weight: '1.0', sortOrder: 1 },

    // ── OFFICE ──
    { objectType: 'office', category: 'facility_quality',   text: 'Kebersihan ruang kerja dan toilet',           weight: '1.0', sortOrder: 1 },
    { objectType: 'office', category: 'facility_quality',   text: 'Fungsi AC dan pencahayaan',                   weight: '1.0', sortOrder: 2 },
    { objectType: 'office', category: 'service_performance',text: 'Kecepatan penanganan kerusakan/permintaan',   weight: '1.5', sortOrder: 1 },
    { objectType: 'office', category: 'service_performance',text: 'Ketersediaan ATK dan perlengkapan kantor',    weight: '1.0', sortOrder: 2 },
    { objectType: 'office', category: 'user_satisfaction',  text: 'Kepuasan keseluruhan terhadap fasilitas kantor', weight: '1.0', sortOrder: 1 },

    // ── VEHICLE ──
    { objectType: 'vehicle', category: 'facility_quality',   text: 'Kondisi dan kebersihan kendaraan',               weight: '1.0', sortOrder: 1 },
    { objectType: 'vehicle', category: 'facility_quality',   text: 'Ketersediaan BBM dan kelengkapan kendaraan',     weight: '1.0', sortOrder: 2 },
    { objectType: 'vehicle', category: 'service_performance',text: 'Ketepatan waktu penjemputan/pengantaran',        weight: '1.5', sortOrder: 1 },
    { objectType: 'vehicle', category: 'service_performance',text: 'Sikap dan profesionalisme pengemudi',            weight: '1.0', sortOrder: 2 },
    { objectType: 'vehicle', category: 'user_satisfaction',  text: 'Kepuasan keseluruhan terhadap layanan kendaraan',weight: '1.0', sortOrder: 1 },

    // ── MEETING ROOM ──
    { objectType: 'meeting_room', category: 'facility_quality',   text: 'Kebersihan dan kerapian ruang',                       weight: '1.0', sortOrder: 1 },
    { objectType: 'meeting_room', category: 'facility_quality',   text: 'Fungsi proyektor, AC, dan peralatan meeting',          weight: '1.5', sortOrder: 2 },
    { objectType: 'meeting_room', category: 'service_performance',text: 'Kesiapan ruangan sesuai jadwal booking',               weight: '1.5', sortOrder: 1 },
    { objectType: 'meeting_room', category: 'service_performance',text: 'Kecepatan respon jika ada masalah teknis',              weight: '1.0', sortOrder: 2 },
    { objectType: 'meeting_room', category: 'user_satisfaction',  text: 'Kepuasan keseluruhan terhadap fasilitas meeting room', weight: '1.0', sortOrder: 1 },
  ])

  console.log('✅ Seed selesai!')
  console.log('')
  console.log('Akun dummy (password: password123):')
  console.log('  Users (penilai):        U001–U005  → tabel users')
  console.log('  GA Staff:               G001–G003  → tabel ga_staff')
  console.log('  Admin:                  A002       → tabel ga_staff + admin_flags')
  console.log('  Superadmin:             A001       → tabel ga_staff + admin_flags')

  await pool.end()
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})