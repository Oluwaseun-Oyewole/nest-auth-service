import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code: string,
    public readonly meta?: Record<string, any>,
  ) {
    super({ message, code, meta }, status);
  }
}
