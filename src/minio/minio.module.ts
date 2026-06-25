import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service.js';

/**
 * MinioModule
 *
 * Module global untuk Minio Object Storage.
 * Karena di-mark @Global(), MinioService bisa di-inject
 * di module manapun tanpa perlu import MinioModule lagi.
 *
 * Digunakan di Phase 5 (Ticketing) dan Phase 7 (Export).
 */
@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
