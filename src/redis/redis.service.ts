// import { InjectRedis } from '@nestjs-modules/ioredis';
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    // @Inject(REDIS_CLIENT) private readonly client: Redis,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const s = JSON.stringify(value);
    ttlSeconds
      ? await this.redis.set(key, s, 'EX', ttlSeconds)
      : await this.redis.set(key, s);
  }

  async get<T>(key: string): Promise<T | null> {
    const v = await this.redis.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  // ── Set operations (for session/family tracking) ──────────────────────────

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redis.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.redis.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  // ── Atomic increment (rate limiting) ─────────────────────────────────────

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const [[, count]] = (await pipeline.exec()) as [[null, number]];
    return count;
  }

  // Raw client access for advanced use cases
  getClient(): Redis {
    return this.redis;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis connection closed gracefully');
  }
}
