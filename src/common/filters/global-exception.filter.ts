import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global Exception Filter — DOT Indonesia Error Response Format
 *
 * Semua error response di-wrap dalam format:
 * {
 *   "errors": [
 *     { "key": "field_name", "value": "pesan error" }
 *   ]
 * }
 *
 * Referensi: rules.md §2, prd.md §4.B
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: Array<{ key: string; value: string }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errors = [{ key: 'message', value: exceptionResponse }];
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseBody = exceptionResponse as Record<string, unknown>;

        // Handle class-validator errors (ValidationPipe)
        if (Array.isArray(responseBody['message'])) {
          errors = (responseBody['message'] as string[]).map((msg) => {
            // class-validator messages biasanya format: "propertyName constraint"
            const spaceIndex = msg.indexOf(' ');
            if (spaceIndex > 0) {
              return {
                key: msg.substring(0, spaceIndex),
                value: msg,
              };
            }
            return { key: 'validation', value: msg };
          });
        } else if (typeof responseBody['message'] === 'string') {
          errors = [{ key: 'message', value: responseBody['message'] as string }];
        } else {
          errors = [{ key: 'message', value: exception.message }];
        }
      }
    } else if (exception instanceof Error) {
      // Handle TypeORM EntityNotFoundError dan error lainnya
      const errorName = exception.constructor.name;

      if (errorName === 'EntityNotFoundError') {
        status = HttpStatus.NOT_FOUND;
        errors = [{ key: 'entity', value: 'Resource not found' }];
      } else if (errorName === 'QueryFailedError') {
        status = HttpStatus.BAD_REQUEST;
        errors = [{ key: 'database', value: 'Database query failed' }];
      } else {
        errors = [{ key: 'server', value: 'Internal server error' }];
      }

      this.logger.error(
        `[${request.method}] ${request.url} — ${exception.message}`,
        exception.stack,
      );
    } else {
      errors = [{ key: 'server', value: 'An unexpected error occurred' }];
      this.logger.error(`[${request.method}] ${request.url} — Unknown error`, String(exception));
    }

    response.status(status).json({ errors });
  }
}
