# 📘 Phase 4 — Order & Payment Management

> **Goal:** Sistem pembuatan order, integrasi payment gateway (Xendit), dan tracking status pesanan menggunakan background jobs (BullMQ).

---

## Daftar Isi

1. [Instalasi Dependencies](#1-instalasi-dependencies)
2. [Order Entity & Module](#2-order-entity--module)
3. [Integrasi Xendit & Pembuatan Invoice](#3-integrasi-xendit--pembuatan-invoice)
4. [Background Jobs (BullMQ) & Auto-Expire](#4-background-jobs-bullmq--auto-expire)
5. [Endpoints API](#5-endpoints-api)

---

## 1. Instalasi Dependencies

Phase ini menggunakan beberapa *third-party libraries* untuk Queuing dan Xendit.

```bash
npm install @nestjs/bullmq bullmq xendit-node
```

Pendaftaran di `app.module.ts`:
```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ...
  ]
})
export class AppModule {}
```

---

## 2. Order Entity & Module

**Entity:** `src/orders/entities/order.entity.ts`
Menyimpan riwayat pemesanan pengguna.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign Key ke `users` |
| `eventId` | UUID | Foreign Key ke `events` |
| `quantity` | INT | Jumlah tiket yang dipesan |
| `totalAmount` | DECIMAL | Total harga `quantity * event.price` |
| `status` | ENUM | `PENDING`, `PAID`, `EXPIRED` |
| `paymentUrl` | TEXT | URL Xendit Invoice |
| `xenditInvoiceId`| VARCHAR | External ID Xendit |

---

## 3. Integrasi Xendit & Pembuatan Invoice

Saat pengguna memanggil `POST /orders`, transaksi TypeORM berjalan untuk **mengurangi kuota** dan **membuat order**.
Secara atomik, kita memanggil Xendit SDK (`xendit-node`) untuk membuat invoice:

```typescript
const invoice = await this.xendit.Invoice.createInvoice({
  data: {
    externalId: savedOrder.id,
    amount: totalAmount,
    payerEmail: email,
    description: `Payment for Event: ${event.title}`,
    invoiceDuration: 900, // 15 mins
  }
});
```

Kemudian `XENDIT_WEBHOOK_TOKEN` digunakan di endpoint `POST /payments/webhook` untuk memvalidasi bahwa callback benar-benar datang dari Xendit.

---

## 4. Background Jobs (BullMQ) & Auto-Expire

Jika user tidak membayar dalam waktu 15 menit, kita harus mengembalikan kuota event (release lock) dan mengubah status Order menjadi `EXPIRED`.

Saat Order dibuat, sebuah delayed job di-*dispatch* ke antrian (queue) "orders":
```typescript
await this.ordersQueue.add(
  'expire-order',
  { orderId: savedOrder.id },
  { delay: 15 * 60 * 1000 },
);
```

**Worker:** `src/orders/processors/order.processor.ts` akan mengeksekusi fungsi ini setelah 15 menit dan menjalankan *database transaction* untuk mengecek apakah order masih `PENDING`. Jika ya, ubah menjadi `EXPIRED` dan pulihkan `quota` pada entity `Event`.

---

## 5. Endpoints API

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/orders` | ✅ | USER | Membuat pesanan tiket dan *invoice* pembayaran |
| `GET` | `/api/orders` | ✅ | USER | Melihat daftar riwayat order milik *user* sendiri |
| `GET` | `/api/orders/:id` | ✅ | ALL | Melihat detail satu order |
| `GET` | `/api/admin/orders` | ✅ | ADMIN | Melihat seluruh order (Admin only) |
| `POST` | `/api/payments/webhook` | ❌ | — | Endpoint Webhook Callback untuk Xendit |
