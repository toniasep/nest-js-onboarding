import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Interface untuk JWT payload
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
}

/**
 * JWT Strategy untuk Passport
 *
 * Extract JWT token dari Authorization header (Bearer scheme),
 * validasi signature, dan return payload sebagai user object di request.
 *
 * Referensi: rules.md §5 — JWT Auth + Guards
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Passport memanggil method ini setelah JWT terverifikasi.
   * Return value akan di-attach ke request.user.
   */
  validate(payload: JwtPayload): { id: string; email: string; role: string } {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
