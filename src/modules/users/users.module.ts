import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UserRepository } from './repositories/user.repository.js';
import { UsersController } from './users.controller.js';

/**
 * Users Module
 *
 * Mengelola entitas User dan operasi terkait.
 * Export UsersService agar bisa digunakan oleh AuthModule.
 *
 * Referensi: rules.md §1 — Modular Architecture
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
