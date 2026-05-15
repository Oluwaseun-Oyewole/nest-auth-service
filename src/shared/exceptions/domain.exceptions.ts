import { HttpStatus } from '@nestjs/common';
import { AppException } from './base.exceptions';

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id: string) {
    super(
      `${resource} with ${id} not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resource, id },
    );
  }
}

export class DuplicateResourceException extends AppException {
  constructor(resource: string, id: string) {
    super(
      `${resource} with ${id} already exists`,
      HttpStatus.CONFLICT,
      'DUPLICATE_RESOURCE',
      { resource, id },
    );
  }
}

export class BusinessRuleException extends AppException {
  constructor(message: string, meta?: Record<string, any>) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'BUSINESS_RULE_VIOLATION',
      meta,
    );
  }
}

export class UnauthorizedAccessException extends AppException {
  constructor(reason?: string) {
    super(
      reason ?? 'You are not authorized to perform this action',
      HttpStatus.FORBIDDEN,
      'UNAUTHORIZED_ACCESS',
    );
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super(
      'Invalid credentials provided',
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
    );
  }
}

export class InvalidTokenException extends AppException {
  constructor() {
    super(
      'The provided token is invalid',
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
    );
  }
}

export class PermissionDeniedException extends AppException {
  constructor(action: string) {
    super(
      `You do not have permission to ${action}`,
      HttpStatus.FORBIDDEN,
      'PERMISSION_DENIED',
      { action },
    );
  }
}

export class DatabaseException extends AppException {
  constructor(message: string, meta?: Record<string, any>) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', meta);
  }
}

export class ExternalServiceException extends AppException {
  constructor(
    serviceName: string,
    message: string,
    meta?: Record<string, any>,
  ) {
    super(
      `Error from external service ${serviceName}: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      { serviceName, ...meta },
    );
  }
}

export class ValidationException extends AppException {
  constructor(message: string, meta?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', meta);
  }
}

export class TokenExpiredException extends AppException {
  constructor() {
    super(
      'The provided token has expired',
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
    );
  }
}

export class ForbiddenException extends AppException {
  constructor(message: string, type: string = 'FORBIDDEN') {
    super(message, HttpStatus.FORBIDDEN, type);
  }
}

export class BadRequestException extends AppException {
  constructor(message: string, type: string = 'BAD_REQUEST') {
    super(message, HttpStatus.BAD_REQUEST, type);
  }
}
