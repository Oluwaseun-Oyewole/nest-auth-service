import { HttpStatus } from '@nestjs/common';
import {
  ApiResponse,
  ResponseMeta,
} from '../interfaces/api-response.interface';

export class ResponseBuilder {
  static success<T>(
    data: T,
    message = 'Request successful',
    statusCode = HttpStatus.OK,
    meta?: ResponseMeta,
    path?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  static created<T>(
    data: T,
    message = 'Resource created successfully',
  ): ApiResponse<T> {
    return this.success(data, message, HttpStatus.CREATED);
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Request successful',
  ): ApiResponse<T[]> {
    return this.success(data, message, HttpStatus.OK, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  static noContent(
    message = 'Resource deleted successfully',
  ): ApiResponse<null> {
    return this.success(null, message, HttpStatus.OK);
  }
}
