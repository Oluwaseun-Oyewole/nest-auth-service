import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload } from '../auth.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET_KEY'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JWTPayload & { jti: string },
  ): Promise<JWTPayload> {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!refreshToken) {
      throw new Error('Refresh token not found in request');
    }
    return { ...payload };
  }
}
