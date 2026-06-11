# 📘 Phase 3 — Event Category & Event Management

> **Goal:** CRUD untuk kategori event dan event, fitur publish/unpublish, search, dan pagination.

---

## Daftar Isi

1. [Instalasi Dependencies (Caching)](#1-instalasi-dependencies-caching)
2. [EventCategory Entity & Module](#2-eventcategory-entity--module)
3. [Event Entity & Module](#3-event-entity--module)
4. [Relasi Database](#4-relasi-database)
5. [Endpoints Event Categories](#5-endpoints-event-categories)
6. [Endpoints Events & Caching](#6-endpoints-events--caching)
7. [Verifikasi Build & Run](#7-verifikasi-build--run)

---

## 1. Instalasi Dependencies (Caching)

Untuk mengimplementasikan *Redis Caching* pada endpoint `GET /events`, kita membutuhkan paket bawaan NestJS untuk *caching*.

```bash
npm install @nestjs/cache-manager cache-manager-ioredis-yet @nestjs/mapped-types
```

Pendaftaran di `app.module.ts`:
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        }),
      }),
    }),
    ...
  ]
})
export class AppModule {}
```

---

## 2. EventCategory Entity & Module

**Entity:** `src/event-categories/entities/event-category.entity.ts`
Menyimpan master data kategori event seperti "Konser", "Seminar", dll.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | VARCHAR(100) | Nama kategori |
| `description` | TEXT | Deskripsi (opsional) |

---

## 3. Event Entity & Module

**Entity:** `src/events/entities/event.entity.ts`
Menyimpan data event yang berhubungan dengan Kategori.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary Key |
| `title` | VARCHAR(255) | Judul event |
| `description` | TEXT | Penjelasan event |
| `location` | VARCHAR(255) | Lokasi event |
| `eventDate` | TIMESTAMP | Tanggal dan jam pelaksanaan |
| `price` | DECIMAL | Harga tiket |
| `quota` | INT | Total kapasitas/kuota |
| `isPublished` | BOOLEAN | Draft (false) atau Published (true) |
| `categoryId` | UUID | Foreign Key ke `event_categories` |

---

## 4. Relasi Database

Menggunakan anotasi TypeORM `@OneToMany` dan `@ManyToOne` untuk mendefinisikan relasi:

Di `EventCategory`:
```typescript
@OneToMany(() => Event, (event) => event.category)
events!: Event[];
```

Di `Event`:
```typescript
@ManyToOne(() => EventCategory, (category) => category.events)
@JoinColumn({ name: 'categoryId' })
category!: EventCategory;
```

---

## 5. Endpoints Event Categories

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/event-categories` | ✅ | ADMIN | Create category |
| `GET` | `/api/event-categories` | ❌ | — | List + search + pagination |
| `GET` | `/api/event-categories/:id` | ❌ | — | Detail category |
| `PUT` | `/api/event-categories/:id` | ✅ | ADMIN | Update category |
| `DELETE` | `/api/event-categories/:id` | ✅ | ADMIN | Delete category |

---

## 6. Endpoints Events & Caching

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/events` | ✅ | ADMIN | Create event |
| `GET` | `/api/events` | ❌ | — | List Public (Hanya Published) + Redis Caching |
| `GET` | `/api/events/all` | ✅ | ADMIN | List Admin (Termasuk Draft) |
| `GET` | `/api/events/:id` | ❌ | — | Detail event |
| `PUT` | `/api/events/:id` | ✅ | ADMIN | Update event |
| `DELETE` | `/api/events/:id` | ✅ | ADMIN | Delete event |
| `PATCH` | `/api/events/:id/publish` | ✅ | ADMIN | Toggle isPublished |

### Implementasi Redis Caching
Endpoint `GET /api/events` dilindungi menggunakan fitur caching bawaan NestJS:
```typescript
@UseInterceptors(CacheInterceptor)
@Get()
findAll(@Query() listDto: ListEventDto) {
  return this.eventsService.findAll(listDto, true);
}
```

---

## 7. Verifikasi Build & Run

Pastikan untuk melakukan build ulang dan menjalankan server:

```bash
npm run build
npm run start:dev
```
Semua endpoint sekarang sudah bisa dites melalui cURL atau Postman.
