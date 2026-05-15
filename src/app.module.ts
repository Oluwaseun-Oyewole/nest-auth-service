import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis/src/throttler-storage-redis.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisConfig } from 'redis/redis.config';
import { databaseConfigOptions } from '../database/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { IntegrationServicesModule } from './integration-services/integration-services.module';
import { RedisModule } from './redis/redis.module';
import { SessionsModule } from './sessions/sessions.module';
import { appConfig } from './shared/config';
import { UserTokensModule } from './user-tokens/user-tokens.module';
import { UserModule } from './user/user.module';

import { APP_GUARD } from '@nestjs/core';
import { OtpModule } from './otp/otp.module';
import { RedisSessionsModule } from './redis-sessions/redis-sessions.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, redisConfig],
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: seconds(5),
          limit: 3,
        },
        {
          name: 'medium',
          ttl: seconds(30),
          limit: 10,
        },

        {
          name: 'long',
          ttl: seconds(60),
          limit: 20,
        },
      ],
      storage: new ThrottlerStorageRedisService(),
      // getTracker: (req) => {
      //   return req.headers['x-device-id'] || req.ip;
      // },
      errorMessage: 'Too many requests. Please try again later.',
    }),

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
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
