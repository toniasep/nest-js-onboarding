import { SetMetadata } from '@nestjs/common';

/**
 * Decorator untuk melewati ResponseTransformInterceptor.
 * Digunakan pada endpoint yang membutuhkan raw response (misal: webhook).
 *
 * Contoh penggunaan:
 * @SkipResponseTransform()
 * @Post('webhook')
 * handleWebhook() { ... }
 */
export const SKIP_RESPONSE_TRANSFORM_KEY = 'skipResponseTransform';
export const SkipResponseTransform = () =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);
