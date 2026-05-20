import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { TOKEN_TYPES } from 'src/psql-tokens/entity/user-token.entity';
import { User } from '../entity/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Full name of the user.',
    example: 'Jane Doe',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  fullname: string;

  @ApiProperty({
    description: 'Unique email address',
    example: 'jane@company.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Account password in plain text; hashed with argon2 before storage.',
    example: 'S3cureP@ssw0rd',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'Registered email for authentication.',
    example: 'jane@company.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @ApiProperty({
    description:
      'Raw password to validate against stored hash; hashed with argon2 before storage.',
    example: 'S3cureP@ssw0rd',
    minLength: 8,
  })
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Verification token issued by email link flow.',
    example: 'a8fba75bb8ef4f419ec6c102f40228b8',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'One-time passcode issued for verification flow.',
    example: '482931',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;

  @IsEnum(TOKEN_TYPES)
  @ApiProperty({
    description: 'Token category that determines verification workflow.',
    enum: TOKEN_TYPES,
    example: TOKEN_TYPES.EMAIL_VERIFICATION,
  })
  type: TOKEN_TYPES;
}

export class VerifyOtpWithRedisDto {
  @ApiProperty({
    description: 'Verification token issued by email link flow.',
    example: 'a8fba75bb8ef4f419ec6c102f40228b8',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'One-time passcode issued for verification flow.',
    example: '482931',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the unverified account.',
    example: 'jane@company.com',
    format: 'email',
  })
  email: string;
}

export class ResendVerificationEmailDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the unverified account.',
    example: 'jane@company.com',
    format: 'email',
  })
  email: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the user requesting password reset.',
    example: 'jane@company.com',
    format: 'email',
  })
  email: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    description: 'New password to set for the account.',
    example: 'N3wS3cureP@ss',
    minLength: 8,
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User ID whose password should be updated.',
    example: '8b48c89e-a58f-4ad5-b0be-d87f8f40c7e4',
  })
  userId: string;
}

export class ResetPasswordWithRedisDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the user requesting password reset.',
    example: 'jane@company.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'OTP paired with the reset token.',
    example: '174205',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    description: 'New account password.',
    example: 'MyNewS3cureP@ss',
    minLength: 8,
  })
  password: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token issued by forgot password flow.',
    example: 'fd0d5ec7b4da4ce79ef4f7f8772fbd28',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'OTP paired with the reset token.',
    example: '174205',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    description: 'New account password.',
    example: 'MyNewS3cureP@ss',
    minLength: 8,
  })
  password: string;
}

export class LogoutAllDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User ID whose active sessions will all be invalidated.',
    example: '8b48c89e-a58f-4ad5-b0be-d87f8f40c7e4',
  })
  userId: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user.',
    example: '8b48c89e-a58f-4ad5-b0be-d87f8f40c7e4',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the user.',
    example: 'Jane Doe',
  })
  fullname: string;

  @ApiProperty({
    description: 'Registered email address.',
    example: 'jane@company.com',
  })
  email: string;

  @ApiProperty({
    description:
      'Indicates whether the user has activated their account via email verification.',
    example: true,
  })
  activatedAt: Date;

  @ApiProperty({
    description:
      'Timestamp of the last password change; used to invalidate sessions after password updates.',
    example: '2024-01-15T10:20:30Z',
  })
  passwordChangeAt: Date;

  @ApiProperty({
    description:
      'Timestamp of the last successful login; useful for security monitoring and session management.',
    example: '2024-01-20T14:45:00Z',
  })
  lastLoginAt: Date;

  @ApiProperty({
    description: 'Timestamp of when the user account was created.',
    example: '2024-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of the last update to the user account.',
    example: '2024-01-10T15:30:00Z',
  })
  updatedAt: Date;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
