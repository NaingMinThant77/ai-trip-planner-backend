import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { SafeUser } from '../users/users.service';

/**
 * Reads the user that `JwtStrategy.validate` attached to the request.
 * Only meaningful on routes guarded by `JwtAuthGuard`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: SafeUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard.');
    }
    return request.user;
  },
);
