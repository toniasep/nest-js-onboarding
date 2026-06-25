# 📘 Phase 5 — Ticketing (QR Code & PDF Generation)

> **Goal:** Generate tiket otomatis setelah pembayaran berhasil — QR Code unik per tiket, PDF tiket, upload ke Minio (Object Storage), dan download link.

---

## Daftar Isi

1. [Instalasi Dependencies](#1-instalasi-dependencies)
2. [Minio Module (Object Storage)](#2-minio-module-object-storage)
3. [Ticket Entity & Module](#3-ticket-entity--module)
4. [QR Code & PDF Generation](#4-qr-code--pdf-generation)
5. [Background Jobs (BullMQ) & Integrasi Order](#5-background-jobs-bullmq--integrasi-order)
6. [Verifikasi Tiket oleh Admin](#6-verifikasi-tiket-oleh-admin)
7. [Endpoints API](#7-endpoints-api)

---

## 1. Instalasi Dependencies

Phase ini menggunakan tiga library utama untuk QR Code, PDF, dan Object Storage.

```bash
npm install qrcode pdfkit minio
npm install -D @types/qrcode @types/pdfkit
```

| Package | Kegunaan |
|---------|----------|
| `qrcode` | Generate QR Code sebagai PNG buffer |
| `pdfkit` | Generate PDF tiket (tanpa headless browser) |
| `minio` | Official SDK untuk Minio Object Storage |

Tambahkan konfigurasi Minio di `.env`:
```env
# Minio (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_TICKETS=tickets
```

---

## 2. Minio Module (Object Storage)

**Module:** `src/minio/minio.module.ts`
Module global (`@Global()`) yang menyediakan `MinioService` ke seluruh aplikasi tanpa perlu import ulang.

**Service:** `src/minio/minio.service.ts`
Saat aplikasi dimulai (`onModuleInit`), service otomatis mengecek dan membuat bucket `tickets` jika belum ada.

```typescript
this.client = new Minio.Client({
  endPoint: configService.get<string>('MINIO_ENDPOINT', 'localhost'),
  port: configService.get<number>('MINIO_PORT', 9000),
  useSSL: configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
  accessKey: configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
  secretKey: configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
});
```

Service menyediakan tiga method utama:

| Method | Deskripsi |
|--------|-----------|
| `uploadFile(bucket, objectName, buffer, contentType)` | Upload file ke Minio, return object name |
| `getFileUrl(bucket, objectName, expiry?)` | Generate presigned URL (default 1 jam) |
| `getFileStream(bucket, objectName)` | Get readable stream untuk download |

---

## 3. Ticket Entity & Module

**Entity:** `src/tickets/entities/ticket.entity.ts`
Menyimpan data tiket individual — setiap tiket memiliki QR Code dan PDF sendiri.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary Key |
| `orderId` | UUID | Foreign Key ke `orders` |
| `userId` | UUID | Foreign Key ke `users` |
| `eventId` | UUID | Foreign Key ke `events` |
| `ticketCode` | UUID (unique) | Kode unik tiket, dijadikan value QR Code |
| `qrCodeUrl` | TEXT | Object path QR di Minio (e.g. `qr/{code}.png`) |
| `pdfUrl` | TEXT | Object path PDF di Minio (e.g. `pdf/{code}.pdf`) |
| `status` | ENUM | `ACTIVE`, `USED`, `CANCELLED` |

Setiap order dengan `quantity > 1` akan menghasilkan **sebanyak quantity** record Ticket (1 tiket = 1 QR Code).

---

## 4. QR Code & PDF Generation

**QR Code:** Menggunakan library `qrcode` untuk menghasilkan PNG buffer dari `ticketCode` (UUID).

```typescript
const qrBuffer = await QRCode.toBuffer(ticketCode, {
  type: 'png',
  width: 300,
  margin: 2,
  errorCorrectionLevel: 'M',
});
```

**PDF Tiket:** Menggunakan library `pdfkit` untuk menghasilkan PDF berisi:
- Header: "EVENT TICKET"
- Info event: judul, tanggal (format Indonesia), lokasi
- Info pemegang: nama user
- Nomor tiket (e.g. "2 dari 3")
- Ticket code & QR Code image
- Footer: instruksi penggunaan

Kedua file (QR PNG & PDF) di-upload ke Minio dengan path:
- QR Code → `tickets/qr/{ticketCode}.png`
- PDF → `tickets/pdf/{ticketCode}.pdf`

---

## 5. Background Jobs (BullMQ) & Integrasi Order

Saat Xendit mengirim webhook bahwa pembayaran berhasil (`PAID`), `OrdersService` akan men-dispatch job ke antrian (queue) `tickets`:

```typescript
// src/orders/orders.service.ts — handleWebhook()
if (status === 'PAID' || status === 'SETTLED') {
  order.status = OrderStatus.PAID;
  await this.ordersRepository.save(order);
  // Trigger ticket generation via BullMQ
  await this.ticketsService.generateTicketsForOrder(order.id);
}
```

**Worker:** `src/tickets/processors/ticket.processor.ts` memproses job `generate-tickets` di background:

```typescript
@Processor('tickets')
export class TicketProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    if (job.name === 'generate-tickets') {
      await this.ticketsService.createTickets(job.data.orderId);
    }
  }
}
```

Proses `createTickets()` bersifat **idempotent** — jika tiket sudah pernah dibuat untuk order yang sama, proses akan di-skip untuk mencegah duplikasi.

---

## 6. Verifikasi Tiket oleh Admin

Admin dapat memverifikasi tiket dengan men-scan QR Code. Nilai QR Code adalah `ticketCode` (UUID) yang dikirim via `POST /api/tickets/verify`.

Flow verifikasi:
1. Cari tiket berdasarkan `ticketCode`
2. Guard clause: tiket harus berstatus `ACTIVE`
   - Jika `USED` → error: "Ticket has already been used"
   - Jika `CANCELLED` → error: "Ticket has been cancelled"
3. Update status tiket ke `USED`

---

## 7. Endpoints API

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/tickets` | ✅ | USER | Melihat daftar tiket milik *user* sendiri |
| `GET` | `/api/tickets/:id` | ✅ | ALL | Melihat detail satu tiket (validasi ownership) |
| `GET` | `/api/tickets/:id/download` | ✅ | USER | Download PDF tiket (stream dari Minio) |
| `POST` | `/api/tickets/verify` | ✅ | ADMIN | Verifikasi tiket via QR Code, ubah status ke `USED` |
