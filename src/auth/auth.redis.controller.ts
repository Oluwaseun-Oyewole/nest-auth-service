import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/shared/decorators/public-request.decorator';
import { GetToken } from 'src/shared/decorators/token.decorator';
import { CurrentUser } from 'src/shared/decorators/user.decorator';
import { ResponseBuilder } from 'src/shared/utils/api-response.builder';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginDto,
  ResendVerificationEmailDto,
  ResetPasswordWithRedisDto,
  VerifyOtpWithRedisDto,
} from 'src/user/dto/user.dto';
import { AuthWithRedisService } from './auth.redis.service';
import { RegisterResponseDto } from './dto/auth.dto';
import { JWTRefreshTokenGuard } from './guards/jwt-refresh.guard';

@ApiTags('Authentication')
@Controller('auth/redis')
export class RedisAuthController {
  constructor(private readonly authWithRedisService: AuthWithRedisService) {}

  @Public()
  @Post('register')
  async registerWithRedis(@Body() data: CreateUserDto) {
    const resp = await this.authWithRedisService.register(data);
    return ResponseBuilder.created(
      new RegisterResponseDto(resp),
      'User registered successfully. Please check your email to verify your account.',
    );
  }

  @Public()
  @Post('login')
  async loginWithRedis(@Body() data: LoginDto, @Req() req: Request) {
    const resp = await this.authWithRedisService.login(data, req);
    return ResponseBuilder.success(resp, 'Login successful');
  }

  @Public()
  @Post('verify')
  async verifyWithRedis(@Body() data: VerifyOtpWithRedisDto) {
    const resp = await this.authWithRedisService.verify(data);
    return ResponseBuilder.created(resp, 'User verified successfully.');
  }

  @Public()
  @Post('resend-otp')
  async resendOtpWithRedis(@Body() data: ResendVerificationEmailDto) {
    const user = await this.authWithRedisService.resendOtp(data);
    return ResponseBuilder.created(
      user,
      'Verification OTP resent successfully. Please check your email.',
    );
  }

  @Public()
  @Post('forgot-password')
  async forgotPasswordOtpWithRedis(@Body() data: ForgotPasswordDto) {
    const resp = await this.authWithRedisService.forgotPassword(data);
    return ResponseBuilder.created(
      resp,
      'Verification OTP resent successfully. Please check your email.',
    );
  }

  @Public()
  @Post('reset-password')
  async resetPasswordOtpWithRedis(@Body() data: ResetPasswordWithRedisDto) {
    const resp = await this.authWithRedisService.resetPassword(data);
    return ResponseBuilder.created(resp, 'Password reset successfully.');
  }

  @Post('logout')
  async logoutWithRedis(
    @CurrentUser() user: { sub: string; sessionId: string; family: string },
  ) {
    await this.authWithRedisService.logout(
      user.sub,
      user.sessionId,
      user.family,
    );
    return ResponseBuilder.success(null, 'Logged out successfully.');
  }

  @Post('logout-all')
  async logoutAllWithRedis(@CurrentUser() user: { sub: string }) {
    await this.authWithRedisService.logoutAllDevices(user.sub);
    return ResponseBuilder.success(
      null,
      'Logged out from all devices successfully.',
    );
  }

  @Post('refresh-token')
  @UseGuards(JWTRefreshTokenGuard)
  async refreshTokensWithRedis(
    @GetToken() refreshToken: string,
    @CurrentUser() user: { family: string },
  ) {
    const accessAndRefreshTokens =
      await this.authWithRedisService.refreshTokens(refreshToken, user.family);
    return ResponseBuilder.success(
      accessAndRefreshTokens,
      'Tokens refreshed successfully.',
    );
  }
}
