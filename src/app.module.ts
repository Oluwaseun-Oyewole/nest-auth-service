import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisConfig } from 'redis/redis.config';
import { databaseConfigOptions } from '../database/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { IntegrationServicesModule } from './integration-services/integration-services.module';
import { SessionsModule } from './psql-sessions/sessions.module';
import { UserTokensModule } from './psql-tokens/user-tokens.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';

import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { OtpModule } from './redis-otp/otp.module';
import { RedisSessionsModule } from './redis-sessions/redis-sessions.module';
import { TokenModule } from './redis-token/token.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [redisConfig],
    }),

    // ThrottlerModule.forRoot({
    //   throttlers: [
    //     {
    //       name: 'short',
    //       ttl: seconds(5),
    //       limit: 3,
    //     },
    //     {
    //       name: 'medium',
    //       ttl: seconds(30),
    //       limit: 10,
    //     },

    //     {
    //       name: 'long',
    //       ttl: seconds(60),
    //       limit: 20,
    //     },
    //   ],
    //   storage: new ThrottlerStorageRedisService(),
    //   // getTracker: (req) => {
    //   //   return req.headers['x-device-id'] || req.ip;
    //   // },
    //   errorMessage: 'Too many requests. Please try again later.',
    // }),

    TypeOrmModule.forRoot(databaseConfigOptions),
    AuthModule,
    UserModule,
    IntegrationServicesModule,
    UserTokensModule,
    SessionsModule,
    RedisModule,
    OtpModule,
    RedisSessionsModule,
    TokenModule,
    HealthModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
