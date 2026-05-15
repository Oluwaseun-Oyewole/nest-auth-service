import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AppException } from './base.exceptions';

@Catch() // catches ALL exceptions — no argument means catch everything
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const errorResponse = this.handleException(exception, request);

    // Log the error with full context
    this.logger.error(
      `${request.method} ${request.url} ${errorResponse.statusCode}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private handleException(
    exception: unknown,
    request: Request,
  ): ApiResponse<null> {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // ─── Your custom AppException ───────────────────────────
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      return {
        success: false,
        statusCode: status,
        message: body.message,
        error: { code: body.errorCode, details: body.details },
        timestamp,
        path,
      };
    }

    // ─── NestJS built-in HttpExceptions ─────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      return {
        success: false,
        statusCode: status,
        message: typeof body === 'string' ? body : (body as any).message,
        error: { code: 'HTTP_EXCEPTION' },
        timestamp,
        path,
      };
    }

    // ─── TypeORM: Unique Constraint Violation ────────────────
    if (exception instanceof QueryFailedError) {
      const err = exception as any;
      if (err.code === '23505') {
        // PostgreSQL unique violation code
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: { code: 'DB_DUPLICATE', details: err.detail },
          timestamp,
          path,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred',
        error: { code: 'DB_ERROR' },
        timestamp,
        path,
      };
    }

    // ─── TypeORM: Entity Not Found ───────────────────────────
    if (exception instanceof EntityNotFoundError) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: { code: 'NOT_FOUND' },
        timestamp,
        path,
      };
    }

    // ─── Unhandled / Unknown errors ──────────────────────────
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: { code: 'INTERNAL_ERROR' },
      timestamp,
      path,
      data: null,
    };
  }
}
