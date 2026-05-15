import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

class BaseEmailParamsDto {
  @IsNotEmpty()
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;
}

export class SendRegisterEmailDto extends BaseEmailParamsDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @MinLength(5)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;

  @IsUrl({
    allow_fragments: false,
    require_protocol: true,
    protocols: ['https', 'http'],
  })
  verificationLink: string;
}
