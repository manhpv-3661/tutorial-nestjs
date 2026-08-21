import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { extractBearerToken } from '../../../common/utils/extract-bearer-token';
import { RedisService } from '../../../redis/redis.service';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request & { token?: string }, payload: JwtPayload) {
    const token = extractBearerToken(req);
    if (token && (await this.redisService.isTokenBlacklisted(token))) {
      throw new UnauthorizedException(this.i18n.t('errors.tokenRevoked'));
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(this.i18n.t('errors.userNotFound'));
    }

    req.token = token ?? undefined;
    return user;
  }
}
