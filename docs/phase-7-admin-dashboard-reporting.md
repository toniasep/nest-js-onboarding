# 📊 Phase 7 — Admin Dashboard & Reporting

> **Goal:** Menyediakan *dashboard* khusus Admin untuk memantau ringkasan penjualan, melihat peringkat acara dan kategori terbaik berdasarkan *revenue*, serta mengekspor data laporan penjualan ke dalam format Excel — didukung dengan implementasi Redis Caching untuk performa.

---

## Daftar Isi

1. [Fitur Utama](#1-fitur-utama)
2. [Instalasi Dependencies](#2-instalasi-dependencies)
3. [Dashboard Module & Service](#3-dashboard-module--service)
4. [Redis Caching Strategy](#4-redis-caching-strategy)
5. [Export Laporan ke Excel & Minio](#5-export-laporan-ke-excel--minio)

---

## 1. Fitur Utama

Sistem menyediakan 4 endpoint utama untuk *admin reporting*:

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| `GET` | `/admin/dashboard/sales` | ADMIN | Mendapatkan total pesanan, pendapatan (*revenue*), dan tiket yang terjual pada rentang tanggal tertentu. |
| `GET` | `/admin/dashboard/top-events` | ADMIN | Mengembalikan peringkat acara (Top Events) berdasarkan total pendapatan. |
| `GET` | `/admin/dashboard/top-categories` | ADMIN | Mengembalikan peringkat kategori acara (Top Categories) berdasarkan total pendapatan. |
| `GET` | `/admin/dashboard/export` | ADMIN | Mengekspor detail seluruh transaksi sukses (*PAID*) dalam rentang tanggal tertentu ke file `.xlsx`. |

*(Seluruh endpoint ini mewajibkan parameter `startDate` dan `endDate` yang divalidasi menggunakan Global Validation Pipe)*

---

## 2. Instalasi Dependencies

Phase ini menambahkan library `exceljs` untuk melakukan penulisan file Excel secara efisien dan rapi.

```bash
npm install exceljs
```

---

## 3. Dashboard Module & Service

**Module:** `src/dashboard/dashboard.module.ts`
Modul ini mendaftarkan `DashboardController` dan `DashboardService`, serta mengimport TypeORM untuk *entity* `Order`. Kebutuhan terhadap Minio dan Redis terpenuhi otomatis karena keduanya dideklarasikan secara *global*.

**Service:** `src/dashboard/dashboard.service.ts`
Berperan menjalankan agregasi (seperti `COUNT` dan `SUM`) terhadap tabel pesanan (`orders`). Service ini memanfaatkan `QueryBuilder` dari TypeORM agar dapat melakukan `GROUP BY` dan `INNER JOIN` dengan lebih luwes. Hanya order yang berstatus `PAID` yang dihitung sebagai penjualan sukses.

---

## 4. Redis Caching Strategy

Dikarenakan kueri analitik dan pelaporan (seperti `SUM` total pendapatan atau grup kategori) sangat membebani *database*, *heavy aggregation queries* ini dilindungi oleh **Redis Cache**.

- **TTL (Time to Live)**: 5 menit (300,000 ms).
- **Cache Key Generator**: Dibuat unik berdasarkan nama fungsi, rentang waktu (`startDate`, `endDate`), dan batasan jumlah (`limit`).
  - Contoh: `dashboard:sales:2026-01-01:2026-01-31`
- **Manual Cache Management**: Berbeda dengan `@UseInterceptors(CacheInterceptor)` di Controller, caching pada dashboard dikendalikan secara manual (`cacheManager.get` dan `cacheManager.set`) di level *service* untuk mendapatkan kontrol lebih presisi pada masing-masing hasil kueri spesifik.

---

## 5. Export Laporan ke Excel & Minio

Alur fungsi ekspor laporan (`exportReport`):

1. **Query Database**: Mengambil seluruh *order* yang berstatus `PAID` pada rentang tanggal yang diminta.
2. **Build Workbook**: Menggunakan `exceljs` untuk membuat file Excel dengan dua halaman (*sheets*):
   - **Sales Summary**: Berisi metrik keseluruhan (Total Pendapatan, Jumlah Tiket).
   - **Orders Detail**: Berisi tabel *row-by-row* dari transaksi yang meliputi pembeli, email, total harga, dan acara terkait.
3. **Upload ke Minio Object Storage**:
   - Sistem akan otomatis membuat *bucket* bernama `reports` (apabila belum ada) saat modul diinisialisasi.
   - *Buffer* hasil tulisan Excel diunggah ke `reports/exports/<nama-file.xlsx>`.
4. **Presigned URL**: Menyediakan URL aman dan sementara (valid 1 jam) kepada klien untuk mengunduh laporan langsung dari *storage*.
