import { Module } from '@nestjs/common';
import { AuthLogger } from './logger.service';

@Module({
  providers: [AuthLogger],
  exports: [AuthLogger],
})
export class LoggerModule {}
