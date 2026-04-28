# Sistem Evaluasi Kinerja General Affairs (GA)

> **Konteks untuk AI:** Ini adalah spesifikasi lengkap sistem evaluasi kinerja GA berbasis survei pengguna fasilitas. Gunakan dokumen ini sebagai single source of truth saat generate kode, skema, atau komponen apapun.

---

## TECH STACK

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16+ (App Router, full-stack) |
| Database | PostgreSQL (via Docker) |
| ORM | Drizzle ORM (type-safe, SQL-first) |
| Auth | JWT custom via `jose`, disimpan di httpOnly cookie |
| Styling | TailwindCSS |
| Validasi | Zod (API routes + form) |
| Cron | node-cron (sync Odoo harian + reminder notifikasi) |

---

## KONSEP INTI

Sistem menilai **kinerja GA secara tidak langsung** melalui evaluasi pengguna terhadap fasilitas yang dikelola GA:

```
User → isi kuesioner → terikat ke OBJEK → objek punya PIC GA → nilai agregat = kinerja GA
```

---

## DATA MODEL

### `users`
```
id, name, email, nik, department, is_active
```
- Sumber: Odoo API (read-only, sync otomatis)
- Dapat menilai objek yang di-assign ke mereka

### `ga_staff`
```
id, name, email, nik, position, odoo_employee_id, is_active
```
- Sumber: Odoo API (read-only, sync otomatis)
- Dibedakan dari `users` via filter `department = "General Affairs"` saat sync
- Satu GA bisa kelola banyak objek

### `objects`
```
id, name, type (mess|office|vehicle|meeting_room), pic_ga_id FK→ga_staff, is_deleted
```
- `assigned_users[]` → list user yang berhak menilai objek ini (relasi many-to-many)
- Soft-delete jika ada data evaluasi

### `evaluation_periods`
```
id, label (e.g. "April 2025"), type (monthly|event_based), start_date, end_date, status (open|closed)
```

### `evaluation_forms`
```
id, object_id FK→objects, user_id FK→users, period_id FK→evaluation_periods,
submitted_at, is_draft, archive_year
```
- **UNIQUE constraint:** `(object_id, user_id, period_id)` — satu user, satu objek, satu periode

### `evaluation_scores`
```
form_id FK→evaluation_forms, question_id FK→questions,
category (facility_quality|service_performance|user_satisfaction),
score INT (1–5), comment VARCHAR(500)
```

### `questions`
```
id, category, object_type (mess|office|vehicle|meeting_room),
text, weight DECIMAL, is_active, sort_order
```
- Pertanyaan bersifat spesifik per `object_type`
- Jika sudah dipakai di periode yang ada submission → tidak bisa dihapus, hanya nonaktifkan

### `notifications`
```
id, recipient_type (ga_staff|admin), recipient_id,
message, trigger (below_threshold|new_feedback|period_closed|period_opened|escalation),
is_read, created_at
```

### `admin_flags`
```
id, odoo_employee_id, employee_name (cache), granted_by, granted_at, is_active
```
- Dikelola terpisah dari Odoo — tidak perlu modifikasi konfigurasi Odoo
- Superadmin pertama di-seed manual saat setup

### `sync_logs`
```
id, triggered_by (cron|manual), status (success|partial|failed),
records_upserted, error_message, created_at
```

---

## DRIZZLE SCHEMA (Contoh Kunci)

```typescript
// lib/db/schema/evaluations.ts
export const evaluationForms = pgTable('evaluation_forms', {
  id:          uuid('id').primaryKey().defaultRandom(),
  objectId:    uuid('object_id').notNull().references(() => objects.id),
  userId:      uuid('user_id').notNull().references(() => users.id),
  periodId:    uuid('period_id').notNull().references(() => periods.id),
  isDraft:     boolean('is_draft').default(true),
  submittedAt: timestamp('submitted_at'),
  archiveYear: integer('archive_year'),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueSubmission: unique().on(t.objectId, t.userId, t.periodId),
}))
```

---

## FORMULA KALKULASI SKOR

```
Score_category = Σ(score_pertanyaan × weight_pertanyaan) / Σ(weight_pertanyaan)

Score_final = (Score_facility × 0.35) + (Score_service × 0.40) + (Score_satisfaction × 0.25)

Score_GA = rata-rata Score_final dari semua objek yang dikelola GA dalam satu periode
```

**Bobot per kategori (dapat dikonfigurasi admin):**
| Kategori | Kode | Bobot Default |
|---|---|---|
| Kualitas Fasilitas | `facility_quality` | 35% |
| Kinerja Layanan | `service_performance` | 40% |
| Kepuasan Pengguna | `user_satisfaction` | 25% |

> Jika tidak ada user yang menilai suatu objek → skor objek = `null`, **tidak dihitung** dalam rata-rata GA (bukan 0).

---

## BUSINESS RULES (Wajib Diimplementasikan)

| Kode | Aturan |
|---|---|
| B1 | 1 user hanya bisa submit 1 evaluasi per objek per periode |
| B2 | User hanya bisa menilai objek yang di-assign ke dirinya |
| B3 | Evaluasi hanya bisa diisi saat periode `status = open` |
| B4 | Skor GA dihitung ulang setiap ada submission baru |
| B5 | Threshold global (default 60%), dikonfigurasi admin. Jika `Score_GA < threshold` → notifikasi GA + eskalasi ke atasan |
| B6 | PIC GA per objek hanya bisa diubah oleh admin |
| B7 | Data User & GA Staff hanya bisa diubah via Odoo sync, tidak boleh diedit manual |
| B8 | Komentar dengan skor ≤ 2 wajib muncul sebagai flag di dashboard admin |
| B9 | Pertanyaan yang sudah dipakai di periode ber-submission → tidak bisa dihapus, hanya nonaktifkan |
| B10 | Objek yang sudah punya data evaluasi → tidak bisa hard-delete, hanya soft-delete |
| B11 | Periode yang sudah ditutup → tidak bisa diedit tanggalnya |

---

## AUTH & ROLE

### Mode Autentikasi

```env
AUTH_MODE=dummy   # dev lokal — skip Odoo, password semua: "password123"
AUTH_MODE=odoo    # production — validasi via Odoo API
```

### Login Flow (AUTH_MODE=odoo)

```
POST NIK + password → Odoo /web/session/authenticate
→ Cek admin_flags → tentukan role
→ Issue JWT → simpan httpOnly cookie
```

### Role & Akses

| Role | Cara Dapat | Akses |
|---|---|---|
| `user` | Login Odoo, dept bukan GA | Isi form evaluasi objek yang di-assign |
| `ga_staff` | Login Odoo, dept = GA | Lihat skor & feedback real-time miliknya |
| `admin` | Login Odoo + flag di DB | CRUD penuh di panel admin |
| `superadmin` | Seed manual saat setup | Semua akses + kelola flag admin |

> Peran ganda (GA + admin) → sistem pakai role tertinggi.

---

## STRUKTUR FOLDER

```
/
├── app/
│   ├── (auth)/login/
│   ├── (user)/evaluate/[objectId]/
│   ├── (ga)/dashboard/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── periods/
│   │   ├── objects/
│   │   ├── questions/
│   │   ├── ga-staff/
│   │   ├── users/
│   │   ├── admin-access/
│   │   ├── settings/
│   │   ├── sync/
│   │   ├── reports/
│   │   └── archives/
│   └── api/
│       ├── auth/login/route.ts
│       ├── evaluations/route.ts
│       ├── objects/route.ts
│       ├── questions/route.ts
│       ├── periods/route.ts
│       ├── admin/flags/route.ts
│       ├── sync/odoo/route.ts
│       └── scores/recalculate/route.ts
│
├── lib/
│   ├── db/
│   │   ├── index.ts              ← Drizzle client
│   │   └── schema/               ← Definisi tabel Drizzle
│   ├── odoo/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── sync.ts
│   ├── auth/
│   │   ├── jwt.ts
│   │   └── session.ts
│   ├── scoring/calculator.ts
│   └── validators/
│
├── drizzle/
│   ├── migrations/
│   ├── seed.ts                   ← Seed data dummy untuk dev
│   └── drizzle.config.ts
│
├── middleware.ts                  ← Route guard by role
└── .env.local
```

---

## API ROUTES

| Method | Route | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | public | Login, issue JWT |
| GET | `/api/objects` | user+ | List objek yang bisa dinilai user ini |
| GET | `/api/objects/[id]/questions` | user+ | Pertanyaan sesuai tipe objek |
| POST | `/api/evaluations` | user | Submit evaluasi |
| PATCH | `/api/evaluations/[id]` | user | Update draft |
| GET | `/api/scores/ga/[gaId]` | ga_staff+ | Skor GA (real-time) |
| POST | `/api/scores/recalculate` | admin | Trigger kalkulasi ulang |
| GET/POST/PATCH/DELETE | `/api/admin/objects` | admin | CRUD objek |
| GET/POST/PATCH/DELETE | `/api/admin/periods` | admin | CRUD periode |
| GET/POST/PATCH/DELETE | `/api/admin/questions` | admin | CRUD pertanyaan |
| GET/PATCH | `/api/admin/settings` | admin | Threshold & bobot |
| POST | `/api/admin/sync/odoo` | admin | Trigger sync manual |
| GET/POST/DELETE | `/api/admin/flags` | superadmin | Kelola flag admin |
| GET | `/api/admin/reports` | admin | Export laporan |

---

## ADMIN PANEL — HALAMAN & KAPABILITAS

| Route | Halaman | Kapabilitas |
|---|---|---|
| `/admin/dashboard` | Overview performa | Read-only monitoring, trend chart, top issues |
| `/admin/periods` | Kelola periode | Create, Edit, buka/tutup, Delete (jika belum ada submission) |
| `/admin/objects` | Kelola objek | Create, Edit, assign/unassign PIC GA, assign/unassign user (single & batch), Soft-delete |
| `/admin/questions` | Bank pertanyaan | Create per tipe objek & kategori, Edit, aktifkan/nonaktifkan, Delete (jika belum dipakai), reorder |
| `/admin/ga-staff` | Profil GA Staff | Read-only (dari Odoo), lihat skor per periode |
| `/admin/users` | Daftar user | Read-only (dari Odoo), lihat riwayat evaluasi |
| `/admin/admin-access` | Hak akses admin | Tambah/cabut flag (superadmin only) |
| `/admin/settings` | Konfigurasi global | Threshold, bobot kategori, filter dept GA |
| `/admin/sync` | Sinkronisasi Odoo | Trigger sync manual, lihat sync_logs |
| `/admin/reports` | Laporan & export | Export Excel/PDF per periode/GA/objek |
| `/admin/archives` | Arsip tahunan | Lihat arsip, trigger arsip tahun berjalan, export |

---

## INTEGRASI ODOO

### Endpoint Odoo yang Dibutuhkan

```
POST /web/session/authenticate    → validasi NIK + password
GET  /api/v1/employees            → list semua karyawan aktif
GET  /api/v1/employees/{id}       → detail satu karyawan
GET  /api/v1/departments          → list departemen
```

### Logika Sync

```
Saat sync dari Odoo:
  IF employee.department_id == ODOO_GA_DEPARTMENT_ID
    → upsert ke tabel ga_staff
  ELSE
    → upsert ke tabel users

Karyawan nonaktif di Odoo → soft-delete di sistem (data historis tetap)
GA Staff pindah dept → status inactive, admin wajib reassign objek
```

### Error Handling Sync
- Timeout → retry 3x dengan exponential backoff
- Partial fail → log error, lanjutkan record lain
- Semua aktivitas sync dicatat di `sync_logs`

---

## NOTIFIKASI

| Trigger | Penerima | Keterangan |
|---|---|---|
| `score_below_threshold` | GA Staff + Admin | Skor di bawah threshold periode berjalan |
| `escalation_to_superior` | Atasan GA | Ringkasan skor & feedback negatif |
| `period_closing_soon` | User yang belum mengisi | Pengingat evaluasi akan ditutup |
| `period_opened` | Semua user | Periode baru dibuka |
| `new_critical_feedback` | Admin | Ada feedback dengan skor ≤ 2 |

**Channel:** In-app (Fase 1) → Email (Fase 2) → WhatsApp/Telegram (Fase 3)

---

## ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ga_db

# Auth mode: "dummy" untuk dev lokal, "odoo" untuk production
AUTH_MODE=dummy

# Odoo (aktif saat AUTH_MODE=odoo)
ODOO_BASE_URL=https://your-odoo-instance.com
ODOO_DB=your_odoo_db
ODOO_GA_DEPARTMENT_ID=5

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=8h
```

---

## DATA SEED (Dev — `npm run db:seed`)

Password semua akun dummy: `password123`

### Users
| NIK | Nama | Department |
|---|---|---|
| U001 | Andi Pratama | Engineering |
| U002 | Rina Susanti | Finance |
| U003 | Deni Kurniawan | Operations |
| U004 | Sari Melati | HR |
| U005 | Bowo Santoso | Engineering |

### GA Staff
| NIK | Nama | Objek yang Dikelola |
|---|---|---|
| G001 | Hendra Wijaya | Mess Block A, Office Lt.1 |
| G002 | Fitri Handayani | Mess Block B, Kendaraan Pool |
| G003 | Agus Salim | Office Lt.2, Meeting Room Utama |

### Admin
| NIK | Nama | Role |
|---|---|---|
| A001 | Budi Santoso | superadmin |
| A002 | Dewi Rahayu | admin |

### Objek & Assignment
| Objek | Tipe | PIC | User yang Bisa Nilai |
|---|---|---|---|
| Mess Block A | mess | Hendra | Andi, Bowo |
| Mess Block B | mess | Fitri | Deni, Sari |
| Office Lantai 1 | office | Hendra | Andi, Rina, Sari |
| Office Lantai 2 | office | Agus | Deni, Bowo |
| Meeting Room Utama | meeting_room | Agus | Semua user |
| Kendaraan Pool | vehicle | Fitri | Andi, Deni |

### Periode
| Label | Status | Rentang |
|---|---|---|
| April 2025 | closed | 1–30 Apr 2025 |
| Mei 2025 | open | 1–31 Mei 2025 |

### Pertanyaan per Tipe Objek

```
[mess]
  facility_quality:
    - Kebersihan kamar dan area bersama (weight: 1)
    - Ketersediaan air dan listrik (weight: 1)
  service_performance:
    - Kecepatan respon laporan kerusakan (weight: 1.5)
    - Sikap dan keramahan petugas GA (weight: 1)
  user_satisfaction:
    - Kepuasan keseluruhan terhadap fasilitas mess (weight: 1)

[office]
  facility_quality:
    - Kebersihan ruang kerja dan toilet (weight: 1)
    - Fungsi AC dan pencahayaan (weight: 1)
  service_performance:
    - Kecepatan penanganan kerusakan/permintaan (weight: 1.5)
    - Ketersediaan ATK dan perlengkapan kantor (weight: 1)
  user_satisfaction:
    - Kepuasan keseluruhan terhadap fasilitas kantor (weight: 1)

[vehicle]
  facility_quality:
    - Kondisi dan kebersihan kendaraan (weight: 1)
    - Ketersediaan BBM dan kelengkapan kendaraan (weight: 1)
  service_performance:
    - Ketepatan waktu penjemputan/pengantaran (weight: 1.5)
    - Sikap dan profesionalisme pengemudi (weight: 1)
  user_satisfaction:
    - Kepuasan keseluruhan terhadap layanan kendaraan (weight: 1)

[meeting_room]
  facility_quality:
    - Kebersihan dan kerapian ruang (weight: 1)
    - Fungsi proyektor, AC, dan peralatan meeting (weight: 1.5)
  service_performance:
    - Kesiapan ruangan sesuai jadwal booking (weight: 1.5)
    - Kecepatan respon jika ada masalah teknis (weight: 1)
  user_satisfaction:
    - Kepuasan keseluruhan terhadap fasilitas meeting room (weight: 1)
```

---

## EDGE CASES

| Skenario | Penanganan |
|---|---|
| User resign di tengah periode | Soft-delete, data historis tetap, tidak bisa isi form baru |
| GA Staff pindah dept | Status inactive via sync, admin wajib reassign objek |
| GA Staff resign di Odoo | Soft-delete, histori nilai tetap, objek perlu di-reassign |
| GA di bawah threshold | Notifikasi ke GA + eskalasi otomatis ke atasan |
| Tidak ada user yang menilai objek | Skor objek = `null`, tidak dihitung dalam rata-rata GA |
| Objek dihapus | Soft-delete, data evaluasi tetap untuk histori |

---

## ROADMAP

### ✅ MVP — Fase 1 (Mulai dari sini)
- [ ] Auth dummy mode (`AUTH_MODE=dummy`)
- [ ] Seed data dummy (users, GA staff, objek, pertanyaan, periode)
- [ ] CRUD objek, periode, pertanyaan (admin)
- [ ] Assign PIC & user ke objek
- [ ] Form kuesioner evaluasi (user) — star rating 1–5, simpan draft, konfirmasi sebelum submit
- [ ] Kalkulasi skor otomatis setiap ada submission
- [ ] Dashboard admin dasar (tabel ranking GA, flag merah jika di bawah threshold)
- [ ] Dashboard GA staff (lihat skor & feedback miliknya)

### 🔜 Fase 2
- [ ] Switch ke `AUTH_MODE=odoo` — integrasi Odoo API
- [ ] Notifikasi in-app + email
- [ ] Trend chart & analisis top issues di dashboard
- [ ] Export laporan PDF/Excel

### 🔮 Fase 3
- [ ] Eskalasi ke atasan (notifikasi + ringkasan otomatis)
- [ ] Arsip tahunan (kolom `archive_year` di `evaluation_forms`)
- [ ] Evaluasi berbasis event (custom date range)
- [ ] Mobile-friendly / PWA

---

## KEPUTUSAN DESAIN (FINAL)

| # | Keputusan |
|---|---|
| 1 | Assign user ke objek → manual oleh admin |
| 2 | GA Staff lihat skor → real-time |
| 3 | Threshold → global, dikonfigurasi admin |
| 4 | Evaluasi di bawah threshold → eskalasi ke atasan |
| 5 | Pertanyaan → berbeda per tipe objek |
| 6 | Auth → NIK + password Odoo (`AUTH_MODE=dummy` untuk dev) |
| 7 | Retensi data → arsip tahunan via kolom `archive_year` (soft archive, no migration) |
| 8 | Role ganda → ambil role tertinggi |
| 9 | Skor null vs 0 → objek tanpa penilai = null, tidak ikut rata-rata |
