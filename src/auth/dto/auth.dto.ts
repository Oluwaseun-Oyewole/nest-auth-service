import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/user/dto/user.dto';

class AuthTokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: Date })
  timestamp: Date | string;

  constructor(data: {
    message: string;
    tokens: Record<'accessToken' | 'refreshToken', string>;
    user: UserResponseDto;
  }) {
    ((this.message = data.message), (this.tokens = data.tokens));
    this.user =
      data.user instanceof UserResponseDto
        ? data.user
        : new UserResponseDto(data.user);
    this.timestamp = new Date();
  }
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Email verification details',
    type: Object,
    example: {
      token: 'verification-token',
      email: 'user@example.com',
    },
  })
  verification: {
    token: string;
    email: string;
  };

  constructor(verification?: { token: string; email: string }) {
    this.verification = verification;
  }
}

export class VerifyResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    example: 'Account verified successfully.',
  })
  message: string;

  constructor(message: string) {
    this.success = true;
    this.message = message;
  }
}

export class ResendVerificationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    example: 'Verification email resent successfully.',
  })
  message: string;

  @ApiProperty({ type: Date })
  timestamp: Date | string;

  constructor(message: string) {
    this.success = true;
    this.message = message;
    this.timestamp = new Date();
  }
}

export class ResetPasswordResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    example: 'Password reset successfully.',
  })
  message: string;

  @ApiProperty({ type: Date })
  timestamp: Date | string;

  constructor(message: string) {
    this.success = true;
    this.message = message;
    this.timestamp = new Date();
  }
}

export class LogoutResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    example: 'Logged out successfully.',
  })
  message: string;

  @ApiProperty({ type: Date })
  timestamp: Date | string;

  constructor(message: string) {
    this.success = true;
    this.message = message;
    this.timestamp = new Date();
  }
}

export class RefreshTokenResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({
    example: 'Tokens refreshed successfully.',
  })
  message: string;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  @ApiProperty({ type: Date })
  timestamp: Date | string;

  constructor(
    message: string,
    tokens: Record<'accessToken' | 'refreshToken', string>,
  ) {
    this.success = true;
    this.message = message;
    this.tokens = tokens;
    this.timestamp = new Date();
  }
}
