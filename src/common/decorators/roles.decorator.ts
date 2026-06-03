import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key untuk roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 *
 * Set metadata role yang dibutuhkan untuk mengakses endpoint.
 * Digunakan bersama RolesGuard.
 *
 * Penggunaan:
 * ```
 * @Roles(Role.ADMIN)
 * @Patch(':id')
 * update() { ... }
 *
 * // Multiple roles:
 * @Roles(Role.ADMIN, Role.USER)
 * @Get()
 * findAll() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
