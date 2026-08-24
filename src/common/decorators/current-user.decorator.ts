import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { User } from '../../modules/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | null => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    return request.user ?? null;
  },
);
