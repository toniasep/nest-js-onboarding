# 📋 Task Breakdown — Sistem Manajemen Tiket dan Acara

## 📦 Tech Stack

1. Typescript
2. Node.js > v20.0
3. Nest.js 11
4. PostgreSQL
5. TypeORM
6. Redis

## ⚙️ Prerequisite

Sebelum memulai pengembangan sistem, pastikan Anda telah memenuhi semua persyaratan berikut:

**Tools:**

1. Install Node.js > v20.0
2. Install Typescript
3. Install Nest.js CLI
4. Install PostgreSQL
5. Install Redis
6. Install Minio (Object Storage)

**Pemahaman Dasar:**

1. Node.js
2. Typescript Programming Language
3. Database / SQL

## 🎯 Objective

Menerapkan fundamental NestJS:

- Modular architecture (module, controller, service, provider)
- DTO + Validation Pipe
- Auth (JWT) + Guards
- Interceptor (logging/caching), Exception Filter
- TypeORM (entities, relations, migrations, repository pattern)
- PostgreSQL (transaksi sederhana)
- Redis untuk cache (hot data) & BullMQ untuk queue (email/QR/auto-expire)
- Config management (dotenv), rate limiting, pagination, sorting

## 👥 Aktor

1. **Admin**
   1. Mengelola data master:
      1. Event,
      2. Order,
      3. Ticket,
      4. serta Manajemen Pengguna
2. **Pengguna**
   1. Melihat daftar event dan
   2. Melakukan pembelian tiket secara mandiri

---

# 🚀 Phased Development Plan

> Setiap phase dirancang agar bisa di-*deliver* secara independen dan bertahap.
> Semua kode harus mengikuti standar yang tercantum di [rules.md](file:///z:/DOT/nest-js-onboarding/rules.md) dan [prd.md](file:///z:/DOT/nest-js-onboarding/prd.md).

---

## Phase 1 — Project Setup & Foundation

> **Goal:** Membangun fondasi project NestJS dengan konfigurasi, koneksi database, dan standar respons API yang seragam.

### Checklist

- [x] Inisialisasi project NestJS 11 (`nest new`)
- [x] Setup TypeScript Strict Mode
- [x] Setup `.env` dan `ConfigModule` (dotenv) untuk environment variables
- [x] Setup koneksi PostgreSQL menggunakan TypeORM (`TypeOrmModule`)
- [x] Setup koneksi Redis (`ioredis`)
- [x] Implementasi **Global Exception Filter** — format error response sesuai standar DOT Indonesia (`errors[]` dengan `key` + `value`)
- [x] Implementasi **Global Response Interceptor** — wrap response sukses ke dalam `{ data: ... }`
- [x] Implementasi **Global Logging Interceptor** — log setiap request masuk (method, url, duration)
- [x] Setup **Global Validation Pipe** (`class-validator` + `class-transformer`)
- [x] Buat helper **Pagination & Sorting** — reusable DTO dan utility
- [x] Setup **Rate Limiting** (`@nestjs/throttler`)
- [x] Pastikan project bisa di-*run* tanpa error (`npm run build` ✅)

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| Modular Architecture | rules.md §1 |
| RESTful Response Format (success & error) | rules.md §2, prd.md §4.B |
| Validation Pipe + DTO | rules.md §1 |
| Clean Code — Guard Clauses, Extract Method | rules.md §4 |

---

## Phase 2 — Authentication & User Management

> **Goal:** Sistem registrasi, login, JWT auth, role-based access control, dan manajemen profil user.

### Checklist

- [ ] Buat `UsersModule`, `UsersController`, `UsersService`
- [ ] Buat entity `User` (id, name, email, password, role [ADMIN/USER], timestamps)
- [ ] Migrasi database untuk tabel `users`
- [ ] Buat `AuthModule`, `AuthController`, `AuthService`
- [ ] Implementasi **Register** endpoint (`POST /auth/register`)
  - [ ] DTO validasi: name, email (unique), password (min length)
  - [ ] Hash password menggunakan `bcrypt`
- [ ] Implementasi **Login** endpoint (`POST /auth/login`)
  - [ ] Validasi credential, return JWT token
- [ ] Implementasi **JWT Strategy** (`@nestjs/passport` + `passport-jwt`)
- [ ] Implementasi **JwtAuthGuard** — proteksi route yang memerlukan autentikasi
- [ ] Implementasi **RolesGuard** + `@Roles()` decorator — role-based access control (Admin vs User)
- [ ] Implementasi **Get Current User Profile** (`GET /users/me`)
- [ ] Implementasi **Role Management** oleh Admin (`PATCH /users/:id/role`)
- [ ] Unit test untuk auth flow (register, login, token validation)

### Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ | — | Registrasi user baru |
| `POST` | `/auth/login` | ❌ | — | Login, return JWT |
| `GET` | `/users/me` | ✅ | ALL | Get current user profile |
| `PATCH` | `/users/:id/role` | ✅ | ADMIN | Update role user |

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| JWT Auth + Guards | rules.md §5 |
| Repository Pattern (User entity) | rules.md §3 |
| DTO + Validation | rules.md §1 |
| Plural nouns URL, correct HTTP methods | rules.md §2 |

---

## Phase 3 — Event Category & Event Management

> **Goal:** CRUD untuk kategori event dan event, fitur publish/unpublish, search, dan pagination.

### Checklist

#### Event Category

- [ ] Buat `EventCategoriesModule`, `EventCategoriesController`, `EventCategoriesService`
- [ ] Buat entity `EventCategory` (id, name, description, timestamps)
- [ ] Migrasi database untuk tabel `event_categories`
- [ ] Implementasi **CRUD Event Category**
  - [ ] `POST /event-categories` — Create (Admin only)
  - [ ] `GET /event-categories` — List + Search + Pagination (Public)
  - [ ] `GET /event-categories/:id` — Detail (Public)
  - [ ] `PUT /event-categories/:id` — Update (Admin only)
  - [ ] `DELETE /event-categories/:id` — Delete (Admin only)
- [ ] DTO validasi untuk create & update

#### Events

- [ ] Buat `EventsModule`, `EventsController`, `EventsService`
- [ ] Buat entity `Event` (id, title, description, location, eventDate, price, quota, isPublished, categoryId, timestamps)
- [ ] Setup relasi `@ManyToOne` Event → EventCategory dan `@OneToMany` EventCategory → Event
- [ ] Migrasi database untuk tabel `events`
- [ ] Implementasi **CRUD Events**
  - [ ] `POST /events` — Create event (Admin only)
  - [ ] `GET /events` — List + Search + Pagination + Sorting (Public, hanya `isPublished = true`)
  - [ ] `GET /events/:id` — Detail event (Public)
  - [ ] `PUT /events/:id` — Update event (Admin only)
  - [ ] `DELETE /events/:id` — Delete event (Admin only)
- [ ] Implementasi **Publish / Unpublish** (`PATCH /events/:id/publish`)
- [ ] DTO validasi untuk create & update
- [ ] Implementasi **Redis Caching** untuk list events (hot data)

### Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/event-categories` | ✅ | ADMIN | Create category |
| `GET` | `/event-categories` | ❌ | — | List + search + pagination |
| `GET` | `/event-categories/:id` | ❌ | — | Detail category |
| `PUT` | `/event-categories/:id` | ✅ | ADMIN | Update category |
| `DELETE` | `/event-categories/:id` | ✅ | ADMIN | Delete category |
| `POST` | `/events` | ✅ | ADMIN | Create event |
| `GET` | `/events` | ❌ | — | List + search + pagination |
| `GET` | `/events/:id` | ❌ | — | Detail event |
| `PUT` | `/events/:id` | ✅ | ADMIN | Update event |
| `DELETE` | `/events/:id` | ✅ | ADMIN | Delete event |
| `PATCH` | `/events/:id/publish` | ✅ | ADMIN | Toggle publish status |

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| Entity Relations (`@ManyToOne`, `@OneToMany`) | rules.md §3 |
| Redis Caching via Interceptor | rules.md §5 |
| Pagination & Sorting | prd.md §3.2 |
| Plural nouns URL | rules.md §2 |

---

## Phase 4 — Order & Payment

> **Goal:** Sistem pembuatan order, integrasi payment gateway (Xendit), dan tracking status pesanan (PENDING → PAID / EXPIRED).

### Checklist

- [ ] Buat `OrdersModule`, `OrdersController`, `OrdersService`
- [ ] Buat entity `Order` (id, userId, eventId, quantity, totalAmount, status [PENDING/PAID/EXPIRED], paymentUrl, xenditInvoiceId, timestamps)
- [ ] Setup relasi `@ManyToOne` Order → User, Order → Event
- [ ] Migrasi database untuk tabel `orders`
- [ ] Implementasi **Create Order** (`POST /orders`)
  - [ ] Validasi: event harus published, quota tersedia
  - [ ] Gunakan **TypeORM Transaction** — create order + kurangi quota event secara atomik
  - [ ] Integrasi **Xendit** — buat invoice pembayaran, simpan `paymentUrl`
- [ ] Implementasi **Xendit Webhook** (`POST /payments/webhook`)
  - [ ] Verifikasi callback signature
  - [ ] Update status order ke `PAID` saat pembayaran berhasil
  - [ ] Trigger proses pembuatan tiket (via BullMQ queue)
- [ ] Implementasi **Get My Orders** (`GET /orders`) — list order milik user login
- [ ] Implementasi **Get Order Detail** (`GET /orders/:id`)
- [ ] Implementasi **Admin: List All Orders** (`GET /admin/orders`) — semua order + filter + pagination
- [ ] Implementasi **BullMQ Job: Auto-Expire Order**
  - [ ] Queue delayed job saat order dibuat (misal 15 menit)
  - [ ] Worker: cek status, jika masih PENDING → ubah ke EXPIRED + kembalikan quota
- [ ] DTO validasi untuk create order

### Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/orders` | ✅ | USER | Create order + payment |
| `GET` | `/orders` | ✅ | USER | List my orders |
| `GET` | `/orders/:id` | ✅ | ALL | Order detail |
| `GET` | `/admin/orders` | ✅ | ADMIN | List all orders + filter |
| `POST` | `/payments/webhook` | ❌ | — | Xendit webhook callback |

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| TypeORM Transaction (multi-step write) | rules.md §3 |
| BullMQ Worker (auto-expire) | rules.md §6 |
| Async/Await (non-blocking) | rules.md §6 |
| Guard Clauses untuk validasi state | rules.md §4 |

---

## Phase 5 — Ticketing (QR Code & PDF Generation)

> **Goal:** Generate tiket setelah pembayaran berhasil — QR Code unik per tiket, PDF tiket, upload ke Minio, dan download link.

### Checklist

- [ ] Buat `TicketsModule`, `TicketsController`, `TicketsService`
- [ ] Buat entity `Ticket` (id, orderId, userId, eventId, ticketCode [UUID], qrCodeUrl, pdfUrl, status [ACTIVE/USED/CANCELLED], timestamps)
- [ ] Setup relasi `@ManyToOne` Ticket → Order, Ticket → User, Ticket → Event
- [ ] Migrasi database untuk tabel `tickets`
- [ ] Implementasi **BullMQ Job: Generate Ticket** (trigger setelah payment PAID)
  - [ ] Generate `ticketCode` unik (UUID)
  - [ ] Generate **QR Code** dari ticketCode (gunakan library `qrcode`)
  - [ ] Generate **PDF Tiket** (gunakan library `pdfkit` atau `puppeteer`)
  - [ ] Upload QR Code & PDF ke **Minio** (Object Storage)
  - [ ] Simpan URL QR & PDF ke entity Ticket
- [ ] Setup **Minio Module** — koneksi dan helper upload/download
- [ ] Implementasi **Get My Tickets** (`GET /tickets`) — list tiket milik user
- [ ] Implementasi **Get Ticket Detail** (`GET /tickets/:id`)
- [ ] Implementasi **Download Tiket PDF** (`GET /tickets/:id/download`)
- [ ] Implementasi **Admin: Verify Ticket** (`POST /tickets/verify`) — scan QR Code, validasi tiket

### Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `GET` | `/tickets` | ✅ | USER | List my tickets |
| `GET` | `/tickets/:id` | ✅ | ALL | Ticket detail |
| `GET` | `/tickets/:id/download` | ✅ | USER | Download PDF tiket |
| `POST` | `/tickets/verify` | ✅ | ADMIN | Verify QR tiket |

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| BullMQ Worker (QR + PDF generation) | rules.md §6 |
| Minio Object Storage | prd.md §3.4 |
| Async/Await | rules.md §6 |
| Repository Pattern (Ticket entity) | rules.md §3 |

---

## Phase 6 — Notification System

> **Goal:** Sistem notifikasi email otomatis: kirim tiket, reminder event, dan notifikasi pembayaran — semua diproses via BullMQ worker.

### Checklist

- [ ] Buat `NotificationsModule`, `NotificationsService`
- [ ] Setup **SMTP Email Provider** (gunakan `nodemailer` atau `@nestjs-modules/mailer`)
- [ ] Buat email templates (HTML):
  - [ ] Template: Payment Successful + Download Link Tiket
  - [ ] Template: Event Reminder (H-1)
  - [ ] Template: Order Expired
- [ ] Implementasi **BullMQ Job: Send Ticket Email**
  - [ ] Trigger setelah tiket berhasil di-generate (Phase 5)
  - [ ] Kirim email berisi link download tiket (Minio URL)
- [ ] Implementasi **BullMQ Job: Event Reminder**
  - [ ] Scheduler/Cron: cek event yang H-1, kirim email reminder ke semua pemegang tiket
- [ ] Implementasi **BullMQ Job: Payment Notification**
  - [ ] Notifikasi saat status order berubah (PAID / EXPIRED)
- [ ] Logging untuk setiap email yang dikirim (success/failure)

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| BullMQ Worker (email sending) | rules.md §6 |
| Async/Await (non-blocking SMTP) | rules.md §6 |
| Separation of Concerns (NotificationsModule terpisah) | rules.md §1 |

---

## Phase 7 — Admin Dashboard & Reporting

> **Goal:** Dashboard admin untuk melihat ringkasan penjualan, top event, dan top category berdasarkan rentang tanggal.

### Checklist

- [ ] Buat `DashboardModule`, `DashboardController`, `DashboardService`
- [ ] Implementasi **Total Penjualan by Date Range** (`GET /admin/dashboard/sales`)
  - [ ] Query parameter: `startDate`, `endDate`
  - [ ] Return: total orders, total revenue, total tickets sold
- [ ] Implementasi **Top Events by Revenue** (`GET /admin/dashboard/top-events`)
  - [ ] Query parameter: `startDate`, `endDate`, `limit`
  - [ ] Return: ranked list of events by total amount penjualan
- [ ] Implementasi **Top Event Categories by Revenue** (`GET /admin/dashboard/top-categories`)
  - [ ] Query parameter: `startDate`, `endDate`, `limit`
  - [ ] Return: ranked list of categories by total amount penjualan
- [ ] Implementasi **Export Laporan** (`GET /admin/dashboard/export`)
  - [ ] Export data penjualan ke format CSV/Excel
  - [ ] Upload file ke Minio, return download link
- [ ] Redis Caching untuk dashboard queries (heavy aggregation)

### Endpoints

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `GET` | `/admin/dashboard/sales` | ✅ | ADMIN | Total penjualan by date range |
| `GET` | `/admin/dashboard/top-events` | ✅ | ADMIN | Top events by revenue |
| `GET` | `/admin/dashboard/top-categories` | ✅ | ADMIN | Top categories by revenue |
| `GET` | `/admin/dashboard/export` | ✅ | ADMIN | Export laporan |

### Standar yang Diterapkan

| Standar | Referensi |
|---|---|
| Redis Caching (heavy queries) | prd.md §3.6 |
| Pagination + Date Range Filter | prd.md §3.5 |
| Repository Pattern (aggregate queries) | rules.md §3 |
| Clean Code — Extract Method untuk complex queries | rules.md §4 |

---

## 🌐 Third-Party Integration Summary

| Service | Digunakan di Phase | Keterangan |
|---|---|---|
| PostgreSQL + TypeORM | Phase 1–7 | Database utama |
| Redis | Phase 1, 3, 7 | Caching hot data & dashboard |
| BullMQ + Redis | Phase 4, 5, 6 | Background jobs (auto-expire, QR/PDF, email) |
| Xendit (Payment Gateway) | Phase 4 | Simulasi pembayaran, webhook |
| Minio (Object Storage) | Phase 5, 7 | Simpan QR Code, PDF, export laporan |
| SMTP (Email) | Phase 6 | Kirim notifikasi email |
| QR Code Generator (lib) | Phase 5 | Generate QR Code unik per tiket |

---

## 🔗 Referensi Tambahan

- Rest API Standarization: [https://github.com/pt-dot/restful-api-standardization](https://github.com/pt-dot/restful-api-standardization "smartCard-inline")
- Clean Code & Design Pattern: [https://refactoring.guru/](https://refactoring.guru/ "smartCard-inline")
- Nest.js Docs: [https://docs.nestjs.com/](https://docs.nestjs.com/ "smartCard-inline")
- TypeORM Docs: [https://typeorm.io/docs/getting-started/](https://typeorm.io/docs/getting-started/ "smartCard-inline")

## 📖 Learning Resources

- Node.js Tutorial: [https://www.youtube.com/watch?v=b39Xqf5iyjo&pp=ygUQbm9kZSBqcyB0dXRvcmlhbA%3D%3D](https://www.youtube.com/watch?v=b39Xqf5iyjo&pp=ygUQbm9kZSBqcyB0dXRvcmlhbA%3D%3D "smartCard-inline")
- Typescript Tutorial: [https://youtube.com/playlist?list=PL-CtdCApEFH9jIdygiF4vTIs4Xpo_cHhC&si=H8eKjps-cq0a_SZp](https://youtube.com/playlist?list=PL-CtdCApEFH9jIdygiF4vTIs4Xpo_cHhC&si=H8eKjps-cq0a_SZp "smartCard-inline")
- Nest.js Tutorial: [https://www.youtube.com/watch?v=BXTEwuoDkDQ&pp=ygUQbmVzdCBqcyB0dXRvcmlhbA%3D%3D](https://www.youtube.com/watch?v=BXTEwuoDkDQ&pp=ygUQbmVzdCBqcyB0dXRvcmlhbA%3D%3D "smartCard-inline")