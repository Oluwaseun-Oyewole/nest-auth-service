import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
          retryStrategy(times) {
            // Exponential backoff: retry up to 10 times
            if (times > 10) return null; // stop retrying
            return Math.min(times * 100, 3000);
          },
          reconnectOnError(err) {
            // Reconnect on READONLY errors (useful in Redis Sentinel/Cluster)
            return err.message.includes('READONLY');
          },
          lazyConnect: false,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => console.log('Redis: connected'));
        client.on('ready', () => console.log('Redis: ready'));
        client.on('error', (err) => console.error('Redis error:', err));
        client.on('close', () => console.warn('Redis: connection closed'));
        client.on('reconnecting', () => console.log('Redis: reconnecting...'));

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
