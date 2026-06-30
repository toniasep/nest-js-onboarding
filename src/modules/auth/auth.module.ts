import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './services/v1/auth.v1.service.js';
import { AuthController } from './controllers/v1/auth.v1.controller.js';
import { JwtStrategy } from '../../infrastructures/modules/jwt/strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';

/**
 * Auth Module
 *
 * Mengelola autentikasi JWT:
 * - Register & Login endpoints
 * - JWT token generation & validation
 * - Passport JWT strategy
 *
 * Referensi: rules.md §1 — Modular Architecture
 */
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRATION_SECONDS', 86400), // default: 1 day in seconds
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
