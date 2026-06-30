import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../../services/v1/auth.v1.service.js';
import { RegisterDto } from '../../dtos/requests/v1/register.dto.js';
import { LoginDto } from '../../dtos/requests/v1/login.dto.js';
import { AuthResponseDto } from '../../dtos/responses/v1/auth-response.dto.js';

/**
 * Auth Controller
 *
 * Endpoint publik untuk registrasi dan login.
 * Tidak memerlukan autentikasi.
 *
 * Referensi: rules.md §2 — Plural nouns URL, correct HTTP methods
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Registrasi user baru.
   * Return: 201 Created + user data + JWT token
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    const data = await this.authService.register(registerDto);
    return AuthResponseDto.MapEntity(data);
  }

  /**
   * POST /api/auth/login
   * Login user.
   * Return: 200 OK + user data + JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const data = await this.authService.login(loginDto);
    return AuthResponseDto.MapEntity(data);
  }
}
