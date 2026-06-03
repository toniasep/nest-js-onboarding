import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User Decorator
 *
 * Extract user data dari request object (di-set oleh JwtAuthGuard via Passport).
 * Digunakan sebagai parameter decorator di controller method.
 *
 * Penggunaan:
 * ```
 * @Get('me')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * // Atau ambil field tertentu:
 * @Get('me')
 * getProfile(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    const user = request.user;

    // Jika data (field name) diberikan, return field tersebut
    if (data && user) {
      return user[data];
    }

    return user;
  },
);
