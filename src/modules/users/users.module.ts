import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../infrastructures/databases/entities/user.entity.js';
import { UsersService } from './services/v1/users.v1.service.js';
import { UserRepository } from './repositories/v1/users.v1.repository.js';
import { UsersController } from './controllers/v1/users.v1.controller.js';

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
