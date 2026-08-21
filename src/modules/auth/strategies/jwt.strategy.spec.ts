import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../../../redis/redis.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };
  let redisService: { isTokenBlacklisted: jest.Mock };
  let config: ConfigService;

  const buildRequest = (token: string) =>
    ({
      headers: { authorization: `Bearer ${token}` },
    }) as unknown as import('express').Request & { token?: string };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    redisService = { isTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    config = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    const i18n = { t: jest.fn((key: string) => key) } as unknown as I18nService;

    strategy = new JwtStrategy(
      config,
      usersService as unknown as UsersService,
      redisService as unknown as RedisService,
      i18n,
    );
  });

  it('throws if JWT_SECRET is not configured', () => {
    const missingSecretConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(
      () =>
        new JwtStrategy(
          missingSecretConfig,
          usersService as unknown as UsersService,
          redisService as unknown as RedisService,
          { t: jest.fn() } as unknown as I18nService,
        ),
    ).toThrow('JWT_SECRET is not configured');
  });

  it('rejects a blacklisted token', async () => {
    redisService.isTokenBlacklisted.mockResolvedValue(true);
    const req = buildRequest('revoked-token');

    await expect(
      strategy.validate(req, { sub: 'user-id' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);
    const req = buildRequest('valid-token');

    await expect(
      strategy.validate(req, { sub: 'missing-user' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the user and attaches the token to the request on success', async () => {
    const user = { id: 'user-id' } as User;
    usersService.findById.mockResolvedValue(user);
    const req = buildRequest('valid-token');

    const result = await strategy.validate(req, { sub: 'user-id' });

    expect(result).toBe(user);
    expect(req.token).toBe('valid-token');
  });
});
