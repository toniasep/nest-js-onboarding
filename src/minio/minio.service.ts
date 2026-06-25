import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { PRESIGNED_URL_EXPIRY } from './minio.constants.js';

/**
 * MinioService
 *
 * Service untuk mengelola koneksi dan operasi file di Minio Object Storage.
 * Auto-create bucket saat module init jika belum ada.
 *
 * Referensi: prd.md §3.4 — Minio Object Storage
 * Referensi: rules.md §6 — Async/Await (non-blocking)
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit(): Promise<void> {
    const bucketName = this.configService.get<string>('MINIO_BUCKET_TICKETS', 'tickets');
    await this.ensureBucketExists(bucketName);
  }

  /**
   * Pastikan bucket ada, buat jika belum.
   */
  async ensureBucketExists(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName);
      this.logger.log(`Bucket "${bucketName}" created successfully`);
    } else {
      this.logger.log(`Bucket "${bucketName}" already exists`);
    }
  }

  /**
   * Upload file ke Minio.
   *
   * @param bucketName - Nama bucket tujuan
   * @param objectName - Nama/path object di bucket (e.g. "qr/abc-123.png")
   * @param buffer - File content sebagai Buffer
   * @param contentType - MIME type (e.g. "image/png", "application/pdf")
   * @returns Object name yang di-upload (untuk disimpan di DB)
   */
  async uploadFile(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    this.logger.debug(`Uploaded "${objectName}" to bucket "${bucketName}"`);
    return objectName;
  }

  /**
   * Generate presigned URL untuk download file.
   *
   * @param bucketName - Nama bucket
   * @param objectName - Nama/path object
   * @param expiry - Durasi URL valid (detik), default dari PRESIGNED_URL_EXPIRY
   * @returns Presigned URL string
   */
  async getFileUrl(
    bucketName: string,
    objectName: string,
    expiry: number = PRESIGNED_URL_EXPIRY,
  ): Promise<string> {
    return this.client.presignedGetObject(bucketName, objectName, expiry);
  }

  /**
   * Get file sebagai readable stream (untuk download endpoint).
   *
   * @param bucketName - Nama bucket
   * @param objectName - Nama/path object
   * @returns Readable stream dari file
   */
  async getFileStream(bucketName: string, objectName: string): Promise<Readable> {
    return this.client.getObject(bucketName, objectName);
  }
}
