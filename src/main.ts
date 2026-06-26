import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import {
  GlobalExceptionFilter,
  ResponseTransformInterceptor,
  LoggingInterceptor,
} from './common/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const logger = new Logger('Bootstrap');

  // ─── Global Prefix ──────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Global Validation Pipe ─────────────────────────────────
  // Validasi semua incoming request DTO menggunakan class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properti yang tidak ada di DTO
      forbidNonWhitelisted: true, // Tolak request jika ada properti tak dikenal
      transform: true, // Auto-transform payload ke DTO instance
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Exception Filter ────────────────────────────────
  // Format error response sesuai standar DOT Indonesia
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Global Interceptors ────────────────────────────────────
  // 1. Logging: log semua request (method, url, duration)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 2. Response Transform: wrap response sukses ke { data: ... }
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));

  // ─── CORS ───────────────────────────────────────────────────
  app.enableCors();

  // ─── Start Server ───────────────────────────────────────────
  const port = configService.get<number>('APP_PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(
    `📝 Environment: ${configService.get<string>('APP_ENV', 'development')}`,
  );
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
