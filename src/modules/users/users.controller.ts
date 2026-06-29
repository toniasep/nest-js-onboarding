import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { User } from './entities/user.entity.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from './entities/user.entity.js';
import { UserResponseDto } from './dto/user-response.dto.js';

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

  private mapToResponseDto(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * GET /api/users/me
   * Mendapatkan profil user yang sedang login.
   * Auth: Required (semua role)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    const fetchedUser = await this.usersService.findById(user.id);
    return this.mapToResponseDto(fetchedUser);
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
    return this.mapToResponseDto(updatedUser);
  }
}
