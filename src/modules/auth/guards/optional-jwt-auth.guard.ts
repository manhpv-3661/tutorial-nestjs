import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
  ): TUser | null {
    if (err) {
      throw err as Error;
    }
    return user || null;
  }
}
