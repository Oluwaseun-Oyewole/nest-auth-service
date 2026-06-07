import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async set(key: string, value: unknown, ttlSeconds?: number) {
    const s = JSON.stringify(value);
    ttlSeconds
      ? await this.redis.set(key, s, 'EX', ttlSeconds)
      : await this.redis.set(key, s);
  }

  async get<T>(key: string) {
    const v = await this.redis.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }

  async del(...keys: string[]) {
    if (keys.length) await this.redis.del(...keys);
  }

  async sadd(key: string, ...members: string[]) {
    await this.redis.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]) {
    await this.redis.srem(key, ...members);
  }

  async smembers(key: string) {
    return this.redis.smembers(key);
  }

  async getClient() {
    return this.redis;
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis connection closed gracefully');
  }
}
