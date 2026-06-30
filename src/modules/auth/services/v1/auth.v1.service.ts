import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../users/services/v1/users.v1.service.js';
import { RegisterDto } from '../../dtos/requests/v1/register.dto.js';
import { LoginDto } from '../../dtos/requests/v1/login.dto.js';
import { User } from '../../../../infrastructures/databases/entities/user.entity.js';

/**
 * Interface untuk response autentikasi
 */
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
}

/**
 * Auth Service
 *
 * Mengelola proses registrasi, login, dan JWT token generation.
 *
 * Referensi:
 * - rules.md §4 — Guard Clauses (return early saat validasi gagal)
 * - rules.md §5 — JWT Auth
 */
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register user baru.
   *
   * Flow:
   * 1. Guard clause: cek apakah email sudah terdaftar
   * 2. Hash password menggunakan bcrypt
   * 3. Create user di database
   * 4. Generate JWT token
   * 5. Return user data + token
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Guard clause: cek duplikat email
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    // Generate token & return
    return this.buildAuthResponse(user);
  }

  /**
   * Login user.
   *
   * Flow:
   * 1. Guard clause: cari user by email (termasuk password)
   * 2. Guard clause: validasi password dengan bcrypt
   * 3. Generate JWT token
   * 4. Return user data + token
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Guard clause: cek user exists
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Guard clause: validasi password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Generate token & return
    return this.buildAuthResponse(user);
  }

  /**
   * Build auth response object (user data + JWT token).
   * Extract method — menghindari duplikasi di register & login.
   */
  private buildAuthResponse(user: User): AuthResponse {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }
}
