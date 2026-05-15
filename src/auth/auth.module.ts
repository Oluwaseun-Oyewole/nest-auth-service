import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailServiceModule } from 'src/integration-services/mail-service/mail-service.module';
import { OtpModule } from 'src/otp/otp.module';
import { RedisSessionsModule } from 'src/redis-sessions/redis-sessions.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { TokenModule } from 'src/token/token.module';
import { UserTokensModule } from 'src/user-tokens/user-tokens.module';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthWithRedisService } from './auth.redis.service';
import { AuthService } from './auth.service';
import { RefreshTokenStrategy } from './strategies/jwt-refresh.strategy';
import { AccessJwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UserModule,
    MailServiceModule,
    UserTokensModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET_KEY'),
        signOptions: { expiresIn: config.get<number>('JWT_ACCESS_EXPIRES') },
      }),
    }),
    SessionsModule,
    OtpModule,
    RedisSessionsModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthWithRedisService,
    AccessJwtStrategy,
    RefreshTokenStrategy,
  ],
})
export class AuthModule {}
