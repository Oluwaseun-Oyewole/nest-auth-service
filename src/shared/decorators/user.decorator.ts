import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from 'src/redis-token/token.service';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
