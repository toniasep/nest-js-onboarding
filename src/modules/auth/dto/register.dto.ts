import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO untuk registrasi user baru
 *
 * Endpoint: POST /auth/register
 * Validasi:
 * - name: required, string, max 100 chars
 * - email: required, valid email format
 * - password: required, min 8 chars
 *
 * Referensi: rules.md §1 — DTO + Validation
 */
export class RegisterDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;
}
