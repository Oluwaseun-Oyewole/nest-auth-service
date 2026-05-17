import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class UserSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  jti: string;

  @IsString()
  @ApiProperty()
  deviceInfo?: string;

  @IsString()
  @ApiProperty()
  ipAddress?: string;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty()
  expiresAt?: Date;
}
