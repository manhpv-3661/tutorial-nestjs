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
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = extractBearerToken(req);
    if (token && (await this.redisService.isTokenBlacklisted(token))) {
      throw new UnauthorizedException(this.i18n.t('errors.tokenRevoked'));
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(this.i18n.t('errors.userNotFound'));
    }

    return user;
  }
}
