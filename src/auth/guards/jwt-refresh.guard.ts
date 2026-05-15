import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JWTRefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor(private reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException(
        'Invalid refresh token. Please log in again.',
      );
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required.');
    }

    return user;
  }
}
