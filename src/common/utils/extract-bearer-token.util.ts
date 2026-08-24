import { ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';

const bearerTokenExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();

export function extractBearerToken(req: Request): string | null {
  return bearerTokenExtractor(req);
}
