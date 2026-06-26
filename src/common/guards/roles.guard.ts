import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Roles Guard
 *
 * Cek apakah user yang sedang login memiliki role yang sesuai
 * dengan role yang dibutuhkan oleh endpoint (via @Roles() decorator).
 *
 * Harus digunakan bersama JwtAuthGuard agar request.user tersedia.
 *
 * Penggunaan:
 * ```
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.ADMIN)
 * @Patch(':id/role')
 * updateRole() { ... }
 * ```
 *
 * Referensi: rules.md §5 — Role-based Access Control
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Ambil roles yang dibutuhkan dari metadata @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Jika tidak ada @Roles() decorator, akses diizinkan
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Ambil user dari request (di-set oleh JwtAuthGuard)
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const user = request.user;

    // Guard clause: user harus ada
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Cek apakah role user ada di daftar requiredRoles
    const hasRole = requiredRoles.includes(user.role ?? '');
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
