// src/shared/swagger/decorators/api-auth.decorator.ts
import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthResponseDto } from 'src/auth/dto/auth.dto';
import {
  APIValidationErrorResponse,
  ForbiddenResponseDto,
  UnauthorizedResponseDto,
} from '../dto/error-response.dto';
import { APISuccessResponse } from '../dto/success-response.dto';

export function ApiPublicAuthRoute(summary: string, description?: string) {
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiResponse({
      status: HttpStatus.CREATED,
      type: AuthResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Validation failed',
      type: APIValidationErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Account not activated yet. Please verify your email.',
      schema: {
        example: {
          statusCode: 403,
          message: 'Account not activated yet. Please verify your email.',
          error: 'Account not activated',
        },
      },
    }),
  );
}

export const SuccessApiResponse = <TModel extends Type<any>>(
  model: TModel,
  options: {
    isArray?: boolean;
    description?: string;
    status?: number | HttpStatus;
  } = {
    isArray: false,
    status: 200,
  },
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(APISuccessResponse) },
          {
            properties: options?.isArray
              ? {
                  payload: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  },
                }
              : {
                  payload: {
                    allOf: [{ $ref: getSchemaPath(model) }],
                  },
                },
          },
        ],
      },
      status: options.status || 200,
      description: options.description,
    }),
  );
};

export function ApiProtectedRoute(summary: string, description?: string) {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({ summary, description }),
    ApiUnauthorizedResponse({
      description: 'Missing, expired, or malformed access token',
      type: UnauthorizedResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Session revoked (user logged out from another device)',
      type: ForbiddenResponseDto,
    }),
  );
}
