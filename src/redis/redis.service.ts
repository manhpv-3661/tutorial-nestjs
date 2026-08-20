import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.client.set(this.blacklistKey(token), '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const value = await this.client.get(this.blacklistKey(token));
    return value !== null;
  }

  private blacklistKey(token: string): string {
    return `token:blacklist:${token}`;
  }
}
