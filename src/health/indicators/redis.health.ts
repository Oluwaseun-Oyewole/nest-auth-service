import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private client: Redis;

  onModuleInit() {
    // Initialise lazily here instead of constructor
    // so NestJS DI lifecycle is respected
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 3000,
      commandTimeout: 3000,
      lazyConnect: true, // don't connect until first command
      maxRetriesPerRequest: 1, // fail fast during health checks
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    // Clean up the connection when the app shuts down
    await this.client?.quit();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.client.ping();

      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING response: ${pong}`);
      }

      return {
        [key]: {
          status: 'up',
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
        },
      };
    } catch (error) {
      throw new Error(
        JSON.stringify({
          [key]: {
            status: 'down',
            message: error instanceof Error ? error.message : String(error),
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
          },
        }),
      );
    }
  }
}
