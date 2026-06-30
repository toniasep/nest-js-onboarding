import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../../shared/decorators/skip-response-transform.decorator.js';

/**
 * Global Response Interceptor — DOT Indonesia Success Response Format
 *
 * Semua response sukses di-wrap dalam format:
 * {
 *   "data": { ... }  // atau array []
 * }
 *
 * Referensi: rules.md §2, prd.md §4.B
 */

export interface WrappedResponse<T> {
  data: T;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  WrappedResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse<T>> {
    // Cek apakah handler di-skip (misal: webhook yang butuh raw response)
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle() as Observable<WrappedResponse<T>>;
    }

    return next.handle().pipe(map((data: T) => ({ data })));
  }
}
