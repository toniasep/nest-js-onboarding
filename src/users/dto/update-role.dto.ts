import { IsEnum } from 'class-validator';
import { Role } from '../entities/user.entity.js';

/**
 * DTO untuk update role user (Admin only)
 *
 * Endpoint: PATCH /users/:id/role
 */
export class UpdateRoleDto {
  @IsEnum(Role, { message: `role must be either ${Role.ADMIN} or ${Role.USER}` })
  role!: Role;
}
