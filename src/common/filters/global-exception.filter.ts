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

    let mainMessage = 'An error occurred';
    let singleError = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        mainMessage = exceptionResponse;
        singleError = exceptionResponse;
        errors = [{ key: 'message', value: exceptionResponse }];
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseBody = exceptionResponse as Record<string, unknown>;

        // Handle class-validator errors (ValidationPipe)
        if (Array.isArray(responseBody['message'])) {
          mainMessage = 'Validation failed';
          errors = (responseBody['message'] as string[]).map((msg) => {
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
          mainMessage = responseBody['message'];
          singleError = responseBody['message'];
          errors = [{ key: 'message', value: responseBody['message'] }];
        } else {
          mainMessage = exception.message;
          singleError = exception.message;
          errors = [{ key: 'message', value: exception.message }];
        }
      }
    } else if (exception instanceof Error) {
      const errorName = exception.constructor.name;

      if (errorName === 'EntityNotFoundError') {
        status = HttpStatus.NOT_FOUND;
        mainMessage = 'Resource not found';
        singleError = mainMessage;
        errors = [{ key: 'entity', value: 'Resource not found' }];
      } else if (errorName === 'QueryFailedError') {
        status = HttpStatus.BAD_REQUEST;
        mainMessage = 'Database query failed';
        singleError = mainMessage;
        errors = [{ key: 'database', value: 'Database query failed' }];
      } else {
        mainMessage = 'Internal server error';
        singleError = mainMessage;
        errors = [{ key: 'server', value: 'Internal server error' }];
      }

      this.logger.error(
        `[${request.method}] ${request.url} — ${exception.message}`,
        exception.stack,
      );
    } else {
      mainMessage = 'An unexpected error occurred';
      singleError = mainMessage;
      errors = [{ key: 'server', value: 'An unexpected error occurred' }];
      this.logger.error(
        `[${request.method}] ${request.url} — Unknown error`,
        String(exception),
      );
    }

    response.status(status).json({
      message: mainMessage,
      errors: errors.length > 0 ? errors : undefined,
      error: singleError,
    });
  }
}
