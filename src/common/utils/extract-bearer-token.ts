import { ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';

export function extractBearerToken(req: Request): string | null {
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}
