import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '../exceptions/domain.exceptions';

export const GetToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ForbiddenException('No token provided');
    }

    return authHeader.split(' ')[1];
  },
);
