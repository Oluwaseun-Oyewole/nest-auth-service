import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
  ) {}

  @HealthCheck()
  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.redisHealthIndicator.isHealthy('redis'),
      () =>
        this.memoryHealthIndicator.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () =>
        this.memoryHealthIndicator.checkRSS('memory_rss', 512 * 1024 * 1024),
      () =>
        this.diskHealthIndicator.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }
}
