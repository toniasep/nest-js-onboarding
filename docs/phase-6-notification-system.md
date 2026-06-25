# 📧 Phase 6 — Notification System

> **Goal:** Sistem notifikasi email otomatis yang dikelola di *background*: kirim link tiket, reminder event H-1, dan notifikasi pesanan kedaluwarsa — semua diproses secara asinkron menggunakan BullMQ worker dan `@nestjs-modules/mailer`.

---

## Daftar Isi

1. [Instalasi Dependencies](#1-instalasi-dependencies)
2. [Konfigurasi SMTP](#2-konfigurasi-smtp)
3. [Notifications Module & Service](#3-notifications-module--service)
4. [Background Jobs (BullMQ)](#4-background-jobs-bullmq)
5. [Scheduler (Cron Job) untuk Reminder](#5-scheduler-cron-job-untuk-reminder)
6. [Email Templates (Handlebars)](#6-email-templates-handlebars)

---

## 1. Instalasi Dependencies

Phase ini menggunakan library mailer yang populer di ekosistem NestJS, dipadukan dengan template engine Handlebars dan modul scheduling.

```bash
npm install @nestjs-modules/mailer nodemailer handlebars @nestjs/schedule
npm install -D @types/nodemailer
```

| Package | Kegunaan |
|---------|----------|
| `@nestjs-modules/mailer` | Modul NestJS untuk integrasi dengan Nodemailer |
| `nodemailer` | Library utama untuk mengirim email via SMTP |
| `handlebars` | Template engine untuk menghasilkan email berformat HTML dinamis |
| `@nestjs/schedule` | Library untuk mengatur cron jobs (menjadwalkan tugas) |

---

## 2. Konfigurasi SMTP

Aplikasi membutuhkan kredensial SMTP untuk dapat mengirim email. Pengaturan disimpan dalam `.env`. Sebagai contoh, menggunakan [Mailtrap](https://mailtrap.io/) untuk lingkungan *development*:

```env
# SMTP (Mailtrap)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Ticketing App <noreply@ticketing.com>"
```

---

## 3. Notifications Module & Service

**Module:** `src/notifications/notifications.module.ts`
Modul ini mendaftarkan `MailerModule` secara asinkron dengan membaca konfigurasi dari `ConfigService`, serta mendefinisikan adapter Handlebars untuk *rendering* template.

```typescript
MailerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    transport: {
      host: configService.get('SMTP_HOST'),
      port: configService.get<number>('SMTP_PORT'),
      auth: {
        user: configService.get('SMTP_USER'),
        pass: configService.get('SMTP_PASS'),
      },
    },
    defaults: {
      from: configService.get('SMTP_FROM'),
    },
    template: {
      dir: join(process.cwd(), 'src/notifications/templates'),
      adapter: new HandlebarsAdapter(),
      options: { strict: true },
    },
  }),
});
```

**Service:** `src/notifications/notifications.service.ts`
Service ini bertugas menyediakan API internal untuk melempar (enqueue) *job* pengiriman email ke BullMQ, dan juga memproses fungsi kirim email sesungguhnya (melalui `MailerService`).

---

## 4. Background Jobs (BullMQ)

Untuk mencegah respons API melambat akibat proses pengiriman email yang memakan waktu, seluruh proses *sending* dilempar ke dalam *queue* `notifications`.

**Worker:** `src/notifications/processors/notification.processor.ts`

Memproses tiga jenis job utama:

1. **`send-ticket-email`**: 
   - Dipicu oleh `TicketsService` setelah tiket (QR Code & PDF) berhasil di-generate.
   - Mengirim template `payment-success.hbs` yang berisi konfirmasi pembayaran dan *link* download masing-masing tiket.

2. **`send-payment-notification`**: 
   - Dipicu oleh `OrdersService` ketika order berubah status menjadi `EXPIRED`.
   - Mengirim template `order-expired.hbs`.

3. **`send-event-reminder`**:
   - Dipicu oleh cron job `EventReminderCron` untuk mengirim notifikasi H-1 acara.
   - Mengirim template `event-reminder.hbs`.

---

## 5. Scheduler (Cron Job) untuk Reminder

**Cron Job:** `src/events/event-reminder.cron.ts`

Sistem mengecek event yang pelaksanaannya jatuh pada keesokan harinya (H-1). Pengecekan ini diaktifkan secara otomatis setiap tengah malam melalui decorator `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`.

Flow eksekusinya:
1. Mendapatkan rentang waktu esok hari (mulai pukul 00:00 hingga 23:59).
2. Melakukan query ke tabel `events` mencari acara berstatus *published* pada rentang waktu tersebut.
3. Untuk tiap event, dicari semua tiket yang `ACTIVE`.
4. Agar seorang pengguna yang membeli 5 tiket tidak menerima 5 email yang sama, program mencatat ID pengguna yang telah dikirimkan menggunakan `Set<string>`.
5. Memicu fungsi enqueue `send-event-reminder` di BullMQ.

*(Catatan: `@nestjs/schedule` membutuhkan `ScheduleModule.forRoot()` di-import di `AppModule`.)*

---

## 6. Email Templates (Handlebars)

Terdapat 3 template dasar berformat HTML yang disimpan di direktori `src/notifications/templates`:

1. **`payment-success.hbs`**: Mengkonfirmasi sukses pembayaran dan memberikan array URL download tiket.
2. **`order-expired.hbs`**: Menginformasikan bahwa masa berlaku pembayaran sudah habis.
3. **`event-reminder.hbs`**: Mengingatkan tanggal, waktu, dan lokasi acara yang akan dihadiri esok hari.

Masing-masing template menerima objek *context* berisikan data dinamis seperti `{{name}}`, `{{orderId}}`, `{{eventTitle}}`, dan lainnya.
