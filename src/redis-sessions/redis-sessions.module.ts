import { Module } from '@nestjs/common';
import { RedisSessionsService } from './redis-sessions.service';

@Module({
  providers: [RedisSessionsService],
  exports: [RedisSessionsService],
})
export class RedisSessionsModule {}
