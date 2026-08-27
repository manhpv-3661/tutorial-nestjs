import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../../redis/redis.service';
import { SALT_ROUNDS } from '../users/constants/users.constants';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(this.i18n.t('errors.emailAlreadyRegistered'));
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    });

    return UserResponseDto.fromEntity(user, this.signToken(user.id));
  }

  async login(dto: LoginDto): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException(this.i18n.t('errors.invalidCredentials'));
    }

    return UserResponseDto.fromEntity(user, this.signToken(user.id));
  }

  getCurrentUser(user: User, token: string): UserResponseDto {
    return UserResponseDto.fromEntity(user, token);
  }

  async logout(token: string): Promise<void> {
    const ttlSeconds = this.getRemainingTtlSeconds(token);
    if (ttlSeconds > 0) {
      await this.redisService.blacklistToken(token, ttlSeconds);
    }
  }

  private signToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  private getRemainingTtlSeconds(token: string): number {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (!decoded?.exp) {
      return 0;
    }
    return decoded.exp - Math.floor(Date.now() / 1000);
  }
}
