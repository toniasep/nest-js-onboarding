import { IsEmail, IsString } from 'class-validator';

/**
 * DTO untuk login user
 *
 * Endpoint: POST /auth/login
 * Validasi:
 * - email: required, valid email format
 * - password: required, string
 *
 * Referensi: rules.md §1 — DTO + Validation
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
