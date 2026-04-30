# Implementation Plan: Refactor Admin UI into Reusable Components

## Goal

Memecah halaman admin yang saat ini masih berisi markup dan logic besar menjadi komponen reusable yang lebih kecil, konsisten, dan mudah dirawat, tanpa mengubah perilaku fitur yang sudah berjalan.

Target utama:
- mengurangi duplikasi layout dan styling
- menjaga konsistensi header, card, tombol, badge, dan modal
- memisahkan UI presentational dari logic page
- membuat halaman admin lebih pendek dan lebih mudah dibaca

---

## Scope

Refactor akan difokuskan pada halaman admin berikut:
- dashboard
- GA staff
- settings
- periods
- objects
- questions

Komponen yang paling mungkin diekstrak:
- page header
- section card
- action button
- status badge
- loading skeleton
- score bar
- modal shell
- empty state
- list row / card item

---

## Current Problems

- Struktur halaman terlalu panjang dan sulit dipindai.
- Pola visual berulang di banyak file.
- Header halaman tidak konsisten antar halaman admin.
- Komponen seperti badge, skeleton, dan button dibuat langsung di file page.
- Perubahan style kecil harus dilakukan di banyak file.
- Logic dan markup tercampur dalam satu file.

---

## Refactor Principles

- Jangan ubah behavior fitur yang sudah ada.
- Jangan memindahkan semua logic sekaligus.
- Mulai dari komponen yang paling sering dipakai.
- Page file tetap menjadi container untuk data fetching, state, dan handler.
- Komponen reusable harus presentational dan menerima props jelas.
- Hindari over-abstraction untuk komponen yang hanya dipakai sekali.

---

## Recommended Component Layers

### 1. Shared UI Components
Komponen yang dipakai lintas halaman:
- `PageHeader`
- `SectionCard`
- `ActionButton`
- `StatusBadge`
- `EmptyState`
- `LoadingSkeleton`
- `ModalShell`

### 2. Domain UI Components
Komponen yang dipakai oleh satu domain admin:
- `ScoreBar`
- `GAStaffRow`
- `ObjectRow`
- `QuestionRow`
- `PeriodRow`
- `SettingsSection`

### 3. Page Containers
File page tetap menangani:
- fetch API
- state loading / saving
- filter / search
- modal state
- submit / delete / update handlers

---

## Proposed Folder Structure

```txt
app/
  (admin)/
    admin/
      dashboard/
        page.tsx
      ga-staff/
        page.tsx
      settings/
        page.tsx
      periods/
        page.tsx
      objects/
        page.tsx
      questions/
        page.tsx

components/
  admin/
    PageHeader.tsx
    SectionCard.tsx
    ActionButton.tsx
    StatusBadge.tsx
    EmptyState.tsx
    LoadingSkeleton.tsx
    ModalShell.tsx
    ScoreBar.tsx