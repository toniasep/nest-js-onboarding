/**
 * Minio Constants
 *
 * Konstanta untuk konfigurasi Minio Object Storage.
 * Referensi: prd.md §3.4 — Minio Object Storage
 */

/** Nama bucket untuk menyimpan file tiket (QR Code & PDF) */
export const TICKETS_BUCKET = 'tickets';

/** Durasi presigned URL (dalam detik) — 1 jam */
export const PRESIGNED_URL_EXPIRY = 3600;
