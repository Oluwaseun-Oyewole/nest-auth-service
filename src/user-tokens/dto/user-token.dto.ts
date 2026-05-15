import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TOKEN_TYPES } from '../entity';

export class VerificationTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  token: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  @MinLength(6)
  @MaxLength(6)
  otpCode?: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  type: TOKEN_TYPES;
}
