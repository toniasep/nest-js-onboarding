import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard
 *
 * Proteksi route yang memerlukan autentikasi.
 * Menggunakan Passport JWT strategy untuk validasi token
 * dari header `Authorization: Bearer <token>`.
 *
 * Penggunaan:
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getProfile() { ... }
 * ```
 *
 * Referensi: rules.md §5 — JWT Auth + Guards
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
