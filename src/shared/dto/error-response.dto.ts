import { ApiProperty } from '@nestjs/swagger';

export class APIErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ description: 'error message is a string' })
  message: string;

  @ApiProperty({ type: Date })
  timestamp: Date | string;
}

export class APIValidationErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    description: 'Invalid Request',
    example: 'Invalid request',
  })
  message: string;

  @ApiProperty()
  error: Array<string>;

  @ApiProperty({ type: Date })
  timestamp: Date | string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Your session has expired. Please log in again.' })
  message: string;

  @ApiProperty({ example: 'Unauthorized' })
  error: string;
}

export class ForbiddenResponseDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({ example: 'Invalid Session' })
  message: string;

  @ApiProperty({ example: 'Forbidden' })
  error: string;
}
