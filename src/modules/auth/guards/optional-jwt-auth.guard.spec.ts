import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
  });

  it('returns null when no credentials were supplied', () => {
    expect(guard.handleRequest(null, false)).toBeNull();
  });

  it('returns the user when authentication succeeds', () => {
    const user = { id: 'user-id' };

    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('rethrows the error when the strategy rejects the token (e.g. revoked/blacklisted)', () => {
    const error = new Error('token revoked');

    expect(() => guard.handleRequest(error, false)).toThrow(error);
  });
});
