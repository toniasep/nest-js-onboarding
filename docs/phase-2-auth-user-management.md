# 📘 Phase 2 — Authentication & User Management

> **Goal:** Sistem registrasi, login, JWT auth, role-based access control, dan manajemen profil user.

---

## Daftar Isi

1. [Install Dependencies](#1-install-dependencies)
2. [Setup Environment Variables (JWT)](#2-setup-environment-variables-jwt)
3. [User Entity](#3-user-entity)
4. [Users Module (Service, Controller, Module)](#4-users-module-service-controller-module)
5. [Auth Module — Register & Login](#5-auth-module--register--login)
6. [JWT Strategy (Passport)](#6-jwt-strategy-passport)
7. [JwtAuthGuard — Proteksi Route](#7-jwtauthguard--proteksi-route)
8. [RolesGuard & @Roles() Decorator — Role-based Access Control](#8-rolesguard--roles-decorator--role-based-access-control)
9. [@CurrentUser() Decorator](#9-currentuser-decorator)
10. [Unit Tests](#10-unit-tests)
11. [Verifikasi Build & Run](#11-verifikasi-build--run)
12. [Struktur File Akhir](#12-struktur-file-akhir)

---

## 1. Install Dependencies

### Perintah

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

### Penjelasan Package

| Package | Fungsi |
|---|---|
| `@nestjs/passport` + `passport` | Framework autentikasi — abstraksi strategy pattern |
| `@nestjs/jwt` | Wrapper NestJS untuk `jsonwebtoken` — generate & verify JWT |
| `passport-jwt` | Passport strategy untuk validasi JWT dari header Authorization |
| `bcrypt` | Library hashing password — menggunakan algoritma bcrypt |
| `@types/passport-jwt` | TypeScript types untuk passport-jwt |
| `@types/bcrypt` | TypeScript types untuk bcrypt |

---

## 2. Setup Environment Variables (JWT)

### Penambahan di `.env`

**File:** [`.env`](file:///z:/DOT/nest-js-onboarding/.env), [`.env.example`](file:///z:/DOT/nest-js-onboarding/.env.example)

```env
# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION_SECONDS=86400
```

| Variable | Fungsi | Default |
|---|---|---|
| `JWT_SECRET` | Secret key untuk menandatangani JWT token | — (wajib diisi) |
| `JWT_EXPIRATION_SECONDS` | Masa berlaku token dalam detik (86400 = 1 hari) | `86400` |

> ⚠️ **Penting:** `JWT_SECRET` harus diganti dengan secret key yang kuat di production. Jangan gunakan value default dari `.env.example`.

---

## 3. User Entity

**File:** [`src/users/entities/user.entity.ts`](file:///z:/DOT/nest-js-onboarding/src/users/entities/user.entity.ts)

### Skema Tabel `users`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | Primary Key, Auto-generated | UUID v4 |
| `name` | VARCHAR(100) | NOT NULL | Nama lengkap user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email user (untuk login) |
| `password` | VARCHAR | NOT NULL, `select: false` | Password ter-hash (bcrypt) |
| `role` | ENUM('ADMIN', 'USER') | DEFAULT 'USER' | Role untuk access control |
| `createdAt` | TIMESTAMP | Auto-generated | Waktu pembuatan |
| `updatedAt` | TIMESTAMP | Auto-updated | Waktu terakhir diupdate |

### Implementasi

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role!: Role;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### Keamanan: `select: false` pada Password

Opsi `select: false` pada kolom `password` memastikan bahwa password **tidak ikut ter-query** secara default. Ini mencegah password ter-expose di response API.

Untuk kasus yang membutuhkan password (misal: validasi login), gunakan `addSelect`:

```typescript
this.userRepository
  .createQueryBuilder('user')
  .addSelect('user.password')
  .where('user.email = :email', { email })
  .getOne();
```

> **Referensi:** rules.md §3 — Repository Pattern & Data Mapper

### Migrasi Database

Karena `synchronize: true` aktif di development, tabel `users` akan otomatis dibuat saat aplikasi dijalankan. TypeORM akan membuat:

```sql
CREATE TABLE "users" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying(100) NOT NULL,
  "email" character varying(255) NOT NULL,
  "password" character varying NOT NULL,
  "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_users_email" UNIQUE ("email"),
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
);
```

---

## 4. Users Module (Service, Controller, Module)

### UsersService

**File:** [`src/users/users.service.ts`](file:///z:/DOT/nest-js-onboarding/src/users/users.service.ts)

Service yang mengelola operasi CRUD untuk entitas User:

| Method | Parameter | Return | Keterangan |
|---|---|---|---|
| `findByEmail(email)` | `string` | `User \| null` | Cari user by email (tanpa password) |
| `findByEmailWithPassword(email)` | `string` | `User \| null` | Cari user by email (termasuk password) |
| `findById(id)` | `string` | `User` | Cari user by ID, throw 404 jika tidak ada |
| `create(data)` | `Partial<User>` | `User` | Buat user baru |
| `updateRole(id, role)` | `string, Role` | `User` | Update role user |

### UsersController

**File:** [`src/users/users.controller.ts`](file:///z:/DOT/nest-js-onboarding/src/users/users.controller.ts)

| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/users/me` | ✅ | ALL | Get current user profile |
| `PATCH` | `/api/users/:id/role` | ✅ | ADMIN | Update role user |

### UsersModule

**File:** [`src/users/users.module.ts`](file:///z:/DOT/nest-js-onboarding/src/users/users.module.ts)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // Di-export untuk AuthModule
})
export class UsersModule {}
```

Poin penting:
- `TypeOrmModule.forFeature([User])` — mendaftarkan User entity untuk dependency injection repository
- `exports: [UsersService]` — memungkinkan `AuthModule` menggunakan `UsersService`

---

## 5. Auth Module — Register & Login

### Register DTO

**File:** [`src/auth/dto/register.dto.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/dto/register.dto.ts)

```typescript
export class RegisterDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;
}
```

### Login DTO

**File:** [`src/auth/dto/login.dto.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/dto/login.dto.ts)

```typescript
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
```

### AuthService

**File:** [`src/auth/auth.service.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/auth.service.ts)

#### Flow Register

```
Input: RegisterDto (name, email, password)
  │
  ├─ Guard clause: cek email duplikat → ConflictException (409)
  │
  ├─ Hash password (bcrypt, 10 salt rounds)
  │
  ├─ Create user di database
  │
  └─ Generate JWT token → Return { user, accessToken }
```

#### Flow Login

```
Input: LoginDto (email, password)
  │
  ├─ Guard clause: cari user by email → UnauthorizedException (401)
  │
  ├─ Guard clause: validasi password → UnauthorizedException (401)
  │
  └─ Generate JWT token → Return { user, accessToken }
```

#### Response Format

```json
{
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

> **Referensi:** rules.md §4 — Guard Clauses (return early), Extract Method pattern

### Keamanan: Pesan Error Login

Perhatikan bahwa pesan error untuk "email tidak ditemukan" dan "password salah" menggunakan pesan **yang sama**: `"Email atau password salah"`. Ini sengaja dilakukan untuk mencegah **user enumeration attack** — penyerang tidak bisa mengetahui apakah sebuah email terdaftar atau tidak.

### AuthController

**File:** [`src/auth/auth.controller.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/auth.controller.ts)

| Method | Endpoint | HTTP Status | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/register` | 201 Created | Registrasi user baru |
| `POST` | `/api/auth/login` | 200 OK | Login (override default 201 dengan `@HttpCode`) |

> **Catatan:** NestJS secara default mengembalikan `201 Created` untuk `POST` request. Untuk endpoint login, kita override ke `200 OK` karena login tidak membuat resource baru.

### AuthModule

**File:** [`src/auth/auth.module.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/auth.module.ts)

```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRATION_SECONDS', 86400),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

Konfigurasi penting:
- `PassportModule.register({ defaultStrategy: 'jwt' })` — set JWT sebagai default strategy
- `JwtModule.registerAsync(...)` — konfigurasi async dari environment variables
- `exports: [JwtModule]` — memungkinkan module lain menggunakan `JwtService`

---

## 6. JWT Strategy (Passport)

**File:** [`src/auth/strategies/jwt.strategy.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/strategies/jwt.strategy.ts)

### Cara Kerja

```
Client Request
  │
  ├─ Header: Authorization: Bearer <token>
  │
  ├─ ExtractJwt.fromAuthHeaderAsBearerToken()
  │   → Extract token dari header
  │
  ├─ Passport verify token signature & expiration
  │   → Jika invalid/expired → 401 Unauthorized
  │
  └─ JwtStrategy.validate(payload)
      → Return { id, email, role }
      → Di-attach ke request.user
```

### JWT Payload

```json
{
  "sub": "123e4567-e89b-12d3-a456-426614174000",
  "email": "john@example.com",
  "role": "USER",
  "iat": 1717300800,
  "exp": 1717387200
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `sub` | UUID | User ID (standard JWT claim "subject") |
| `email` | string | Email user |
| `role` | string | Role user (ADMIN/USER) |
| `iat` | number | Issued at (auto by JWT library) |
| `exp` | number | Expiration time (auto by JWT library) |

---

## 7. JwtAuthGuard — Proteksi Route

**File:** [`src/common/guards/jwt-auth.guard.ts`](file:///z:/DOT/nest-js-onboarding/src/common/guards/jwt-auth.guard.ts)

### Implementasi

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

JwtAuthGuard adalah wrapper sederhana dari Passport's `AuthGuard('jwt')`. Guard ini:
1. Mengambil JWT token dari header `Authorization: Bearer <token>`
2. Memverifikasi signature dan expiration token
3. Memanggil `JwtStrategy.validate()` untuk mendapatkan user data
4. Attach user data ke `request.user`
5. Jika token tidak valid → return `401 Unauthorized`

### Penggunaan

```typescript
// Proteksi single endpoint
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile() { ... }

// Proteksi seluruh controller
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController { ... }
```

---

## 8. RolesGuard & @Roles() Decorator — Role-based Access Control

### @Roles() Decorator

**File:** [`src/common/decorators/roles.decorator.ts`](file:///z:/DOT/nest-js-onboarding/src/common/decorators/roles.decorator.ts)

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Decorator ini menggunakan `SetMetadata` untuk menyimpan daftar role yang dibutuhkan ke metadata handler. Metadata ini kemudian dibaca oleh `RolesGuard`.

### RolesGuard

**File:** [`src/common/guards/roles.guard.ts`](file:///z:/DOT/nest-js-onboarding/src/common/guards/roles.guard.ts)

### Cara Kerja

```
Request masuk
  │
  ├─ JwtAuthGuard (pertama)
  │   → Validasi token, attach request.user
  │
  └─ RolesGuard (kedua)
      │
      ├─ Baca @Roles() metadata
      │   → Jika tidak ada @Roles() → akses diizinkan
      │
      ├─ Ambil user.role dari request.user
      │
      └─ Cek: user.role ∈ requiredRoles?
          → Ya: akses diizinkan ✅
          → Tidak: ForbiddenException (403) ❌
```

### Penggunaan

```typescript
// Hanya ADMIN yang bisa akses
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Patch(':id/role')
updateRole() { ... }

// ADMIN atau USER bisa akses
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.USER)
@Get()
findAll() { ... }
```

> **Penting:** `JwtAuthGuard` **harus** dipasang sebelum `RolesGuard` karena `RolesGuard` membutuhkan `request.user` yang di-set oleh `JwtAuthGuard`.

> **Referensi:** rules.md §5 — JWT Auth + Guards, Role-based Access Control

---

## 9. @CurrentUser() Decorator

**File:** [`src/common/decorators/current-user.decorator.ts`](file:///z:/DOT/nest-js-onboarding/src/common/decorators/current-user.decorator.ts)

Custom parameter decorator untuk mengambil data user dari `request.user`:

```typescript
// Ambil seluruh user object
@Get('me')
getProfile(@CurrentUser() user: User) {
  return user; // { id, email, role }
}

// Ambil field tertentu
@Post()
create(@CurrentUser('id') userId: string) {
  // userId = "123e4567-..."
}
```

### Cara Kerja

`createParamDecorator` membuat decorator yang bisa digunakan sebagai parameter di controller method. Decorator ini mengakses `request.user` yang sudah di-set oleh `JwtAuthGuard`:

```typescript
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user[data] : user;
  },
);
```

---

## 10. Unit Tests

**File:** [`src/auth/auth.service.spec.ts`](file:///z:/DOT/nest-js-onboarding/src/auth/auth.service.spec.ts)

### Test Cases

| Test | Deskripsi | Expected |
|---|---|---|
| Register — success | Register dengan data valid | Return user + token |
| Register — duplicate email | Register dengan email yang sudah ada | Throw `ConflictException` (409) |
| Login — success | Login dengan credential valid | Return user + token |
| Login — wrong email | Login dengan email yang tidak terdaftar | Throw `UnauthorizedException` (401) |
| Login — wrong password | Login dengan password salah | Throw `UnauthorizedException` (401) |
| Token — payload | Cek JWT payload berisi sub, email, role | `jwtService.sign` dipanggil dengan payload yang benar |

### Menjalankan Test

```bash
# Jalankan hanya auth tests
npx jest --testPathPatterns=auth --no-coverage

# Jalankan semua tests
npm test
```

### Hasil Test

```
PASS src/auth/auth.service.spec.ts
  AuthService
    register
      ✓ should register a new user successfully
      ✓ should throw ConflictException if email already exists
    login
      ✓ should login successfully with valid credentials
      ✓ should throw UnauthorizedException if email not found
      ✓ should throw UnauthorizedException if password is wrong
    token generation
      ✓ should include correct payload in JWT token

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

### Jest Configuration Fix

**File:** [`package.json`](file:///z:/DOT/nest-js-onboarding/package.json) (bagian `jest`)

Karena project menggunakan `moduleResolution: "nodenext"` yang mengharuskan import path dengan ekstensi `.js`, perlu ditambahkan `moduleNameMapper` agar Jest bisa me-resolve import tersebut:

```json
"moduleNameMapper": {
  "^(\\.{1,2}/.*)\\.js$": "$1"
}
```

Regex ini menghapus ekstensi `.js` dari relative import path saat Jest me-resolve module, karena Jest bekerja langsung dengan file `.ts`.

---

## 11. Verifikasi Build & Run

### Build

```bash
npm run build
```

Build harus sukses tanpa error.

### Menjalankan Aplikasi

```bash
npm run start:dev
```

### Expected Output

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] UsersModule dependencies initialized
[Nest] LOG [InstanceLoader] AuthModule dependencies initialized
[Nest] LOG [RoutesResolver] AppController {/api}: +Xms
[Nest] LOG [RouterExplorer] Mapped {/api, GET} route
[Nest] LOG [RoutesResolver] AuthController {/api/auth}: +Xms
[Nest] LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
[Nest] LOG [RoutesResolver] UsersController {/api/users}: +Xms
[Nest] LOG [RouterExplorer] Mapped {/api/users/me, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/users/:id/role, PATCH} route
[Nest] LOG [Bootstrap] 🚀 Application is running on: http://localhost:3000/api
```

### Test dengan cURL

#### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'
```

Response (201):
```json
{
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "accessToken": "eyJhbGciOi..."
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'
```

Response (200):
```json
{
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOi..."
  }
}
```

#### Get Profile (Authenticated)

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"
```

Response (200):
```json
{
  "data": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Tanpa Token

```bash
curl http://localhost:3000/api/users/me
```

Response (401):
```json
{
  "errors": [
    { "key": "message", "value": "Unauthorized" }
  ]
}
```

---

## 12. Struktur File Akhir

```
z:\DOT\nest-js-onboarding\
├── src/
│   ├── auth/                                    # 🔐 Authentication module
│   │   ├── dto/
│   │   │   ├── login.dto.ts                     # DTO validasi login
│   │   │   └── register.dto.ts                  # DTO validasi register
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts                  # Passport JWT strategy
│   │   ├── auth.controller.ts                   # POST /auth/register, POST /auth/login
│   │   ├── auth.module.ts                       # AuthModule (Passport + JWT config)
│   │   ├── auth.service.ts                      # Register, Login, Token generation
│   │   └── auth.service.spec.ts                 # Unit tests (6 test cases)
│   ├── users/                                   # 👤 Users module
│   │   ├── dto/
│   │   │   └── update-role.dto.ts               # DTO validasi update role
│   │   ├── entities/
│   │   │   └── user.entity.ts                   # User entity (Role enum)
│   │   ├── users.controller.ts                  # GET /users/me, PATCH /users/:id/role
│   │   ├── users.module.ts                      # UsersModule
│   │   └── users.service.ts                     # CRUD operations
│   ├── common/                                  # 🧩 Shared infrastructure
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts        # @CurrentUser() — extract user dari request
│   │   │   ├── roles.decorator.ts               # @Roles() — set required roles
│   │   │   └── skip-response-transform.decorator.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts                # JWT token validation guard
│   │   │   └── roles.guard.ts                   # Role-based access control guard
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── response-transform.interceptor.ts
│   │   ├── utils/
│   │   │   └── pagination.util.ts
│   │   └── index.ts                             # Barrel export (updated)
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts                            # Root module (+ UsersModule + AuthModule)
│   ├── app.service.ts
│   └── main.ts
├── .env                                         # + JWT_SECRET, JWT_EXPIRATION_SECONDS
├── .env.example                                 # + JWT config template
└── package.json                                 # + auth deps, jest moduleNameMapper fix
```

---

## Registrasi Module di `app.module.ts`

**File:** [`src/app.module.ts`](file:///z:/DOT/nest-js-onboarding/src/app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    TypeOrmModule.forRootAsync({ ... }),
    ThrottlerModule.forRootAsync({ ... }),

    // ─── Feature Modules ──────────────────────────────────────
    UsersModule,
    AuthModule,
  ],
  // ...
})
export class AppModule {}
```

---

## Referensi Standar yang Diterapkan

| Standar | Detail | Sumber |
|---|---|---|
| JWT Auth + Guards | `JwtAuthGuard` via Passport JWT strategy | rules.md §5 |
| Role-based Access Control | `RolesGuard` + `@Roles()` decorator | rules.md §5 |
| Repository Pattern | `UsersService` + TypeORM Repository | rules.md §3 |
| DTO + Validation | `RegisterDto`, `LoginDto`, `UpdateRoleDto` | rules.md §1 |
| Plural nouns URL | `/users/me`, `/auth/register`, `/auth/login` | rules.md §2 |
| Correct HTTP Methods | POST register, POST login, GET profile, PATCH role | rules.md §2 |
| Guard Clauses | Early return saat validasi gagal (duplikat email, wrong password) | rules.md §4 |
| Extract Method | `buildAuthResponse()` — menghindari duplikasi | rules.md §4 |
| Password Security | bcrypt hashing, `select: false`, same error message | Best Practice |
