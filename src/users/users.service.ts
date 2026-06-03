import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './entities/user.entity.js';

/**
 * Users Service
 *
 * Mengelola operasi CRUD untuk entitas User.
 * Password di-exclude dari default select — gunakan addSelect
 * jika perlu mengambil password (misal: saat login).
 *
 * Referensi: rules.md §3 — Repository Pattern
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Cari user berdasarkan email.
   * Tidak termasuk password secara default.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Cari user berdasarkan email, termasuk password.
   * Digunakan oleh AuthService saat validasi login.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Cari user berdasarkan ID.
   * Throw NotFoundException jika tidak ditemukan.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Buat user baru.
   * Password harus sudah di-hash sebelum dipanggil.
   */
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  /**
   * Update role user (Admin only).
   * Throw NotFoundException jika user tidak ditemukan.
   */
  async updateRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepository.save(user);
  }
}
