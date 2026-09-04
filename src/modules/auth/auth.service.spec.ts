import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../../redis/redis.service';
import { SALT_ROUNDS } from '../users/constants/users.constants';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { CreateUserData } from '../users/interfaces';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    create: jest.Mock<Promise<User>, [CreateUserData]>;
    toResponseDto: jest.Mock<UserResponseDto, [User, string]>;
  };
  let jwtService: {
    sign: jest.Mock<string, [{ sub: string }]>;
    decode: jest.Mock<{ exp?: number } | null, [string]>;
  };
  let redisService: {
    blacklistToken: jest.Mock<Promise<void>, [string, number]>;
  };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-id',
    username: 'jake',
    email: 'jake@jake.jake',
    password: 'hashed-password',
    bio: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
      create: jest.fn<Promise<User>, [CreateUserData]>(),
      toResponseDto: jest
        .fn<UserResponseDto, [User, string]>()
        .mockImplementation((user, token) =>
          UserResponseDto.fromEntity(user, token),
        ),
    };
    jwtService = {
      sign: jest
        .fn<string, [{ sub: string }]>()
        .mockReturnValue('signed-token'),
      decode: jest.fn<{ exp?: number } | null, [string]>(),
    };
    redisService = {
      blacklistToken: jest.fn<Promise<void>, [string, number]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when the email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(
        authService.register({
          username: 'jake',
          email: 'jake@jake.jake',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('hashes the password and returns a signed token on success', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation((data) =>
        Promise.resolve(buildUser({ ...data })),
      );

      const result = await authService.register({
        username: 'jake',
        email: 'jake@jake.jake',
        password: 'password123',
      });

      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', createArg.password)).toBe(
        true,
      );
      expect(result.user.token).toBe('signed-token');
      expect(result.user.email).toBe('jake@jake.jake');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@jake.jake', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const hashed = await bcrypt.hash('correct-password', SALT_ROUNDS);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ password: hashed }),
      );

      await expect(
        authService.login({ email: 'jake@jake.jake', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a signed token when credentials are valid', async () => {
      const hashed = await bcrypt.hash('correct-password', SALT_ROUNDS);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ password: hashed }),
      );

      const result = await authService.login({
        email: 'jake@jake.jake',
        password: 'correct-password',
      });

      expect(result.user.token).toBe('signed-token');
    });
  });

  describe('getCurrentUser', () => {
    it('wraps the user and token into a UserResponseDto', () => {
      const user = buildUser({ bio: 'hi' });

      const dto = authService.getCurrentUser(user, 'jwt-token');

      expect(dto.user).toEqual({
        username: 'jake',
        email: 'jake@jake.jake',
        bio: 'hi',
        image: null,
        token: 'jwt-token',
      });
    });
  });

  describe('logout', () => {
    it('blacklists the token for its remaining TTL', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      jwtService.decode.mockReturnValue({ exp: nowSeconds + 120 });

      await authService.logout('some.jwt.token');

      expect(redisService.blacklistToken).toHaveBeenCalledWith(
        'some.jwt.token',
        expect.any(Number),
      );
      const ttl = redisService.blacklistToken.mock.calls[0][1];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);
    });

    it('does nothing when the token is already expired', async () => {
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      await authService.logout('expired.jwt.token');

      expect(redisService.blacklistToken).not.toHaveBeenCalled();
    });

    it('does nothing when the token cannot be decoded', async () => {
      jwtService.decode.mockReturnValue(null);

      await authService.logout('garbage-token');

      expect(redisService.blacklistToken).not.toHaveBeenCalled();
    });
  });
});
