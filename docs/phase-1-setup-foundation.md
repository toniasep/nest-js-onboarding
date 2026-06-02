# 📘 Phase 1 — Project Setup & Foundation

> **Goal:** Membangun fondasi project NestJS dengan konfigurasi, koneksi database, dan standar respons API yang seragam.

---

## Daftar Isi

1. [Inisialisasi Project NestJS 11](#1-inisialisasi-project-nestjs-11)
2. [Setup TypeScript Strict Mode](#2-setup-typescript-strict-mode)
3. [Setup Environment Variables (.env + ConfigModule)](#3-setup-environment-variables-env--configmodule)
4. [Setup Koneksi PostgreSQL (TypeORM)](#4-setup-koneksi-postgresql-typeorm)
5. [Setup Koneksi Redis](#5-setup-koneksi-redis)
6. [Global Exception Filter (DOT Indonesia Format)](#6-global-exception-filter-dot-indonesia-format)
7. [Global Response Interceptor](#7-global-response-interceptor)
8. [Global Logging Interceptor](#8-global-logging-interceptor)
9. [Global Validation Pipe](#9-global-validation-pipe)
10. [Pagination & Sorting Helper](#10-pagination--sorting-helper)
11. [Rate Limiting (Throttler)](#11-rate-limiting-throttler)
12. [Verifikasi Build](#12-verifikasi-build)
13. [Struktur File Akhir](#13-struktur-file-akhir)

---

## 1. Inisialisasi Project NestJS 11

### Perintah

```bash
npx -y @nestjs/cli@latest new nest-ticketing --strict --package-manager npm --directory ./
```

### Penjelasan Flag

| Flag | Fungsi |
|---|---|
| `--strict` | Mengaktifkan strict mode TypeScript saat scaffolding |
| `--package-manager npm` | Menggunakan npm sebagai package manager |
| `--directory ./` | Membuat project di direktori saat ini (bukan subfolder baru) |

### Hasil

NestJS CLI akan men-generate struktur awal project:

```
├── src/
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .prettierrc
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### Install Dependencies Tambahan

Setelah project ter-scaffold, install semua dependency yang dibutuhkan Phase 1:

```bash
npm install @nestjs/config @nestjs/typeorm typeorm pg @nestjs/cache-manager cache-manager @nestjs/throttler class-validator class-transformer ioredis
```

| Package | Fungsi |
|---|---|
| `@nestjs/config` | Membaca environment variables dari `.env` |
| `@nestjs/typeorm` + `typeorm` + `pg` | ORM dan driver PostgreSQL |
| `@nestjs/cache-manager` + `cache-manager` | Abstraksi caching |
| `@nestjs/throttler` | Rate limiting |
| `class-validator` + `class-transformer` | Validasi DTO |
| `ioredis` | Redis client |

---

## 2. Setup TypeScript Strict Mode

**File:** [`tsconfig.json`](file:///z:/DOT/nest-js-onboarding/tsconfig.json)

NestJS CLI sudah men-generate beberapa opsi strict secara terpisah (`strictNullChecks`, `noImplicitAny`, `strictBindCallApply`). Kita mengganti semua opsi terpisah tersebut dengan satu opsi `"strict": true` yang mencakup **semua** strict checks sekaligus.

### Perubahan

```diff
  "compilerOptions": {
    ...
    "skipLibCheck": true,
-   "strictNullChecks": true,
+   "strict": true,
    "forceConsistentCasingInFileNames": true,
-   "noImplicitAny": true,
-   "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
```

### Apa yang di-enforce oleh `strict: true`?

| Opsi | Deskripsi |
|---|---|
| `strictNullChecks` | Variabel tidak bisa null/undefined kecuali dideklarasikan eksplisit |
| `strictBindCallApply` | Validasi tipe pada `bind`, `call`, `apply` |
| `strictFunctionTypes` | Parameter fungsi dicek secara kontravarian |
| `strictPropertyInitialization` | Properti class harus diinisialisasi di constructor |
| `noImplicitAny` | Tidak boleh ada tipe `any` implisit |
| `noImplicitThis` | `this` harus memiliki tipe yang jelas |
| `alwaysStrict` | Setiap file di-emit dengan `"use strict"` |

> **Referensi:** rules.md §1 — "Language: TypeScript (Strict Mode)"

---

## 3. Setup Environment Variables (.env + ConfigModule)

### File `.env`

**File:** [`.env`](file:///z:/DOT/nest-js-onboarding/.env)

Buat file `.env` di root project. File ini **tidak di-commit** ke git (sudah ada di `.gitignore`).

```env
# Application
APP_PORT=3000
APP_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nest_ticketing

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### File `.env.example`

**File:** [`.env.example`](file:///z:/DOT/nest-js-onboarding/.env.example)

Buat juga `.env.example` sebagai template untuk anggota tim lain. File ini **di-commit** ke git.

### Registrasi ConfigModule

**File:** [`src/app.module.ts`](file:///z:/DOT/nest-js-onboarding/src/app.module.ts)

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,    // Tersedia di semua module tanpa perlu import ulang
      envFilePath: '.env',
    }),
    // ...
  ],
})
export class AppModule {}
```

### Cara Menggunakan di Service/Config

```typescript
import { ConfigService } from '@nestjs/config';

// Inject via constructor
constructor(private readonly configService: ConfigService) {}

// Baca value
const port = this.configService.get<number>('APP_PORT', 3000); // default: 3000
```

---

## 4. Setup Koneksi PostgreSQL (TypeORM)

**File:** [`src/app.module.ts`](file:///z:/DOT/nest-js-onboarding/src/app.module.ts#L20-L35)

TypeORM dikonfigurasi secara **asynchronous** menggunakan `forRootAsync` agar bisa membaca nilai dari `ConfigService` (environment variables).

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres' as const,
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'nest_ticketing'),
    entities: [],
    autoLoadEntities: true,
    synchronize: configService.get<string>('APP_ENV') === 'development',
    logging: configService.get<string>('APP_ENV') === 'development',
  }),
}),
```

### Penjelasan Konfigurasi

| Opsi | Nilai | Penjelasan |
|---|---|---|
| `autoLoadEntities` | `true` | Otomatis load semua entity yang diregistrasi via `TypeOrmModule.forFeature()` |
| `synchronize` | `true` (hanya dev) | Auto-sync schema database dari entity — **JANGAN aktifkan di production** |
| `logging` | `true` (hanya dev) | Log SQL query ke console untuk debugging |

> **Referensi:** rules.md §3 — "Repository Pattern & Data Mapper"

### Prasyarat

Pastikan database PostgreSQL sudah dibuat:

```sql
CREATE DATABASE nest_ticketing;
```

---

## 5. Setup Koneksi Redis

Dependency `ioredis` sudah di-install dan siap digunakan. Redis akan diintegrasikan lebih lanjut di:

- **Phase 3** — Caching data event (hot data)
- **Phase 4** — BullMQ queue (auto-expire order)
- **Phase 5** — BullMQ queue (generate QR + PDF)
- **Phase 6** — BullMQ queue (kirim email)

Pada Phase 1, kita hanya menyiapkan dependency-nya. Konfigurasi koneksi Redis sudah tersedia di `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 6. Global Exception Filter (DOT Indonesia Format)

**File:** [`src/common/filters/global-exception.filter.ts`](file:///z:/DOT/nest-js-onboarding/src/common/filters/global-exception.filter.ts)

### Standar Format Error Response (DOT Indonesia)

Semua error response **wajib** mengikuti format berikut:

```json
{
  "errors": [
    { "key": "email", "value": "email sudah terdaftar" },
    { "key": "password", "value": "password minimal 8 karakter" }
  ]
}
```

> **Referensi:** rules.md §2 — "Error Response Format", prd.md §4.B

### Cara Kerja

Filter ini menggunakan decorator `@Catch()` (tanpa argumen) sehingga menangkap **semua** tipe exception:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // ...
  }
}
```

### Tipe Exception yang Ditangani

| Exception | HTTP Status | Penjelasan |
|---|---|---|
| `HttpException` | Sesuai exception | Exception bawaan NestJS (BadRequest, Unauthorized, dll.) |
| `HttpException` + class-validator | 400 | Validasi DTO gagal — array message dipecah per field |
| `EntityNotFoundError` (TypeORM) | 404 | Entity tidak ditemukan di database |
| `QueryFailedError` (TypeORM) | 400 | Query database gagal (misal: constraint violation) |
| `Error` (generic) | 500 | Error tak terduga |
| Unknown | 500 | Exception bukan tipe Error |

### Contoh Output

**Validasi gagal (class-validator):**
```json
// POST /api/auth/register (tanpa body)
{
  "errors": [
    { "key": "name", "value": "name should not be empty" },
    { "key": "email", "value": "email must be an email" }
  ]
}
```

**Entity tidak ditemukan:**
```json
// GET /api/events/999
{
  "errors": [
    { "key": "entity", "value": "Resource not found" }
  ]
}
```

### Registrasi di `main.ts`

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

## 7. Global Response Interceptor

**File:** [`src/common/interceptors/response-transform.interceptor.ts`](file:///z:/DOT/nest-js-onboarding/src/common/interceptors/response-transform.interceptor.ts)

### Standar Format Success Response (DOT Indonesia)

Semua response sukses **wajib** di-wrap dalam properti `data`:

```json
{
  "data": {
    "id": 1,
    "name": "Music Festival",
    "price": 150000
  }
}
```

Atau untuk array:

```json
{
  "data": [
    { "id": 1, "name": "Music Festival" },
    { "id": 2, "name": "Tech Conference" }
  ]
}
```

> **Referensi:** rules.md §2 — "Success Response Format: Wrap all successful responses inside a `data` root member"

### Cara Kerja

Interceptor menggunakan RxJS `map` operator untuk membungkus return value dari controller ke `{ data: returnValue }`:

```typescript
return next.handle().pipe(
  map((data: T) => ({ data })),
);
```

### Opt-out: `@SkipResponseTransform()`

**File:** [`src/common/decorators/skip-response-transform.decorator.ts`](file:///z:/DOT/nest-js-onboarding/src/common/decorators/skip-response-transform.decorator.ts)

Untuk endpoint yang membutuhkan raw response (misal: webhook dari payment gateway), gunakan decorator ini:

```typescript
@SkipResponseTransform()
@Post('webhook')
handleWebhook(@Body() payload: any) {
  // Response TIDAK dibungkus { data: ... }
  return { received: true };
}
```

### Registrasi di `main.ts`

```typescript
const reflector = app.get(Reflector);
app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));
```

---

## 8. Global Logging Interceptor

**File:** [`src/common/interceptors/logging.interceptor.ts`](file:///z:/DOT/nest-js-onboarding/src/common/interceptors/logging.interceptor.ts)

### Cara Kerja

Interceptor ini mencatat setiap HTTP request yang masuk, termasuk:
- **Method** (GET, POST, PUT, DELETE)
- **URL** (/api/events, /api/orders)
- **Status Code** (200, 201, 400, 500)
- **Duration** (dalam milidetik)

### Format Log

```
[HTTP] GET /api/events - 200 - 42ms
[HTTP] POST /api/orders - 201 - 128ms
[HTTP] GET /api/events/999 - ERROR - 5ms - Resource not found
```

### Implementasi

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} - ${statusCode} - ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`${method} ${url} - ERROR - ${duration}ms - ${error.message}`);
        },
      }),
    );
  }
}
```

### Registrasi di `main.ts`

```typescript
app.useGlobalInterceptors(new LoggingInterceptor());
```

---

## 9. Global Validation Pipe

**File:** [`src/main.ts`](file:///z:/DOT/nest-js-onboarding/src/main.ts#L23-L33)

### Konfigurasi

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### Penjelasan Opsi

| Opsi | Nilai | Penjelasan |
|---|---|---|
| `whitelist` | `true` | Properti yang **tidak** ada di DTO akan otomatis di-strip dari request body |
| `forbidNonWhitelisted` | `true` | Jika ada properti asing → langsung return 400 Bad Request |
| `transform` | `true` | Otomatis transform plain object ke instance DTO class |
| `enableImplicitConversion` | `true` | Otomatis konversi tipe (misal: string `"10"` → number `10` untuk query params) |

> **Referensi:** rules.md §1 — "Validation: Use DTOs for every incoming request body/query"

### Contoh Penggunaan DTO

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
```

Request body yang tidak sesuai DTO akan otomatis ditolak dengan format error DOT Indonesia (ditangani oleh Global Exception Filter).

---

## 10. Pagination & Sorting Helper

### Pagination DTO

**File:** [`src/common/dto/pagination.dto.ts`](file:///z:/DOT/nest-js-onboarding/src/common/dto/pagination.dto.ts)

DTO reusable yang bisa di-extend oleh setiap feature module:

```typescript
export class PaginationDto {
  page: number = 1;        // Default: halaman 1
  limit: number = 10;      // Default: 10 item per halaman (max 100)
  sortBy: string = 'createdAt';  // Default: sort by tanggal dibuat
  sortOrder: SortOrder = SortOrder.DESC;  // Default: terbaru dulu
}
```

### Cara Extend di Feature Module

```typescript
// Contoh: di Events module
export class ListEventsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
```

### Pagination Utility

**File:** [`src/common/utils/pagination.util.ts`](file:///z:/DOT/nest-js-onboarding/src/common/utils/pagination.util.ts)

Fungsi `paginate()` yang bisa digunakan dengan TypeORM QueryBuilder:

```typescript
// Di EventsService
async findAll(dto: ListEventsDto): Promise<PaginatedResult<Event>> {
  const qb = this.eventRepository.createQueryBuilder('event');

  if (dto.search) {
    qb.where('event.title ILIKE :search', { search: `%${dto.search}%` });
  }

  return paginate(qb, dto, ['title', 'createdAt', 'price'], 'event');
}
```

### Format Response Pagination

```json
{
  "data": {
    "items": [
      { "id": 1, "title": "Music Festival", "price": 150000 },
      { "id": 2, "title": "Tech Conference", "price": 200000 }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### Keamanan: Sort Field Whitelist

Fungsi `paginate()` menerima parameter `allowedSortFields` untuk mencegah SQL injection via parameter `sortBy`. Hanya field yang ada di whitelist yang akan digunakan:

```typescript
// Hanya 'title', 'createdAt', dan 'price' yang boleh di-sort
paginate(qb, dto, ['title', 'createdAt', 'price'], 'event');

// Jika user kirim sortBy="; DROP TABLE events" → akan fallback ke 'createdAt'
```

---

## 11. Rate Limiting (Throttler)

**File:** [`src/app.module.ts`](file:///z:/DOT/nest-js-onboarding/src/app.module.ts#L37-L49)

### Konfigurasi

```typescript
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    throttlers: [
      {
        ttl: configService.get<number>('THROTTLE_TTL', 60000),   // 60 detik
        limit: configService.get<number>('THROTTLE_LIMIT', 100), // Max 100 request
      },
    ],
  }),
}),
```

### Global Guard

ThrottlerGuard diregistrasi sebagai global guard menggunakan `APP_GUARD` token:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
],
```

Ini artinya **semua endpoint** secara default terlindungi rate limiting. Default: 100 request per 60 detik per IP.

### Skip Rate Limiting (per endpoint)

Jika ada endpoint yang perlu di-skip (misal: webhook), gunakan decorator `@SkipThrottle()`:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Post('webhook')
handleWebhook() { ... }
```

### Override Limit (per endpoint)

Atau override limit untuk endpoint tertentu:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
login() { ... }  // Max 5 request per 60 detik
```

---

## 12. Verifikasi Build

### Perintah

```bash
# Type check tanpa emit
npx tsc --noEmit

# Full build
npm run build
```

Kedua perintah harus **sukses tanpa error**.

### Menjalankan Project

```bash
npm run start:dev
```

> ⚠️ **Prasyarat:** PostgreSQL dan Redis harus berjalan di localhost sesuai konfigurasi di `.env`.

### Expected Output

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [Bootstrap] 🚀 Application is running on: http://localhost:3000/api
[Nest] LOG [Bootstrap] 📝 Environment: development
```

### Test Endpoint

```bash
curl http://localhost:3000/api

# Expected response:
# { "data": "Hello World!" }
```

---

## 13. Struktur File Akhir

```
z:\DOT\nest-js-onboarding\
├── src/
│   ├── common/                              # 🧩 Shared infrastructure
│   │   ├── decorators/
│   │   │   └── skip-response-transform.decorator.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── response-transform.interceptor.ts
│   │   ├── utils/
│   │   │   └── pagination.util.ts
│   │   └── index.ts                         # Barrel export
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts                        # Root module (Config + TypeORM + Throttler)
│   ├── app.service.ts
│   └── main.ts                              # Bootstrap (Pipes + Filters + Interceptors)
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env                                     # Environment variables (git-ignored)
├── .env.example                             # Template untuk tim
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── tsconfig.json                            # strict: true
└── tsconfig.build.json
```

---

## Registrasi Global di `main.ts`

**File:** [`src/main.ts`](file:///z:/DOT/nest-js-onboarding/src/main.ts)

Semua global configuration didaftarkan di `main.ts` dalam urutan berikut:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Global Prefix — semua endpoint diawali /api
  app.setGlobalPrefix('api');

  // 2. Validation Pipe — validasi DTO otomatis
  app.useGlobalPipes(new ValidationPipe({ ... }));

  // 3. Exception Filter — format error DOT Indonesia
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 4. Logging Interceptor — log setiap request
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 5. Response Transform — wrap { data: ... }
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));

  // 6. CORS — izinkan cross-origin request
  app.enableCors();

  // 7. Start server
  await app.listen(port);
}
```

---

## Referensi Standar yang Diterapkan

| Standar | Detail | Sumber |
|---|---|---|
| Modular Architecture | Organisasi per feature module | rules.md §1 |
| TypeScript Strict Mode | `"strict": true` di tsconfig.json | rules.md — Tech Stack |
| RESTful Success Response | `{ "data": ... }` | rules.md §2, prd.md §4.B |
| RESTful Error Response | `{ "errors": [{ "key", "value" }] }` | rules.md §2, prd.md §4.B |
| Validation Pipe + DTO | `class-validator` + `ValidationPipe` | rules.md §1 |
| Repository Pattern | TypeORM `forRootAsync` + `autoLoadEntities` | rules.md §3 |
| Clean Code | Guard clauses, extract method | rules.md §4 |
| Non-blocking I/O | `async/await` di semua layer | rules.md §6 |
