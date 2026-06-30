import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from '../../services/v1/users.v1.service.js';
import { UpdateRoleDto } from '../../dtos/requests/v1/update-role.dto.js';
import { User } from '../../../../infrastructures/databases/entities/user.entity.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { UserResponseDto } from '../../dtos/responses/v1/user-response.dto.js';

/**
 * Users Controller
 *
 * Endpoint untuk manajemen profil user dan role.
 *
 * Referensi: rules.md §2 — Plural nouns URL, correct HTTP methods
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me
   * Mendapatkan profil user yang sedang login.
   * Auth: Required (semua role)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    const fetchedUser = await this.usersService.findById(user.id);
    return UserResponseDto.MapEntity(fetchedUser);
  }

  /**
   * PATCH /api/users/:id/role
   * Update role user (Admin only).
   * Auth: Required (ADMIN)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.updateRole(
      id,
      updateRoleDto.role,
    );
    return UserResponseDto.MapEntity(updatedUser);
  }
}
