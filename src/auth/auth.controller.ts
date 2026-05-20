import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/shared/decorators/public-request.decorator';
import { ApiPublicAuthRoute } from 'src/shared/decorators/swagger.decorator';
import { GetToken } from 'src/shared/decorators/token.decorator';
import { CurrentUser } from 'src/shared/decorators/user.decorator';
import { APIValidationErrorResponse } from 'src/shared/dto/error-response.dto';
import { ResponseBuilder } from 'src/shared/utils/api-response.builder';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutAllDto,
  ResendVerificationEmailDto,
  ResetPasswordDto,
  ResetPasswordWithRedisDto,
  VerifyOtpDto,
  VerifyOtpWithRedisDto,
} from 'src/user/dto/user.dto';
import { AuthWithRedisService } from './auth.redis.service';
import { AuthService } from './auth.service';
import {
  LogoutResponseDto,
  RefreshTokenResponseDto,
  RegisterResponseDto,
  ResendVerificationResponseDto,
  ResetPasswordResponseDto,
  VerifyResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JWTRefreshTokenGuard } from './guards/jwt-refresh.guard';

// @Public()
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authWithRedisService: AuthWithRedisService,
  ) {}

  @Public()
  @Post('register-redis')
  async registerWithRedis(@Body() data: CreateUserDto) {
    const resp = await this.authWithRedisService.register(data);
    return ResponseBuilder.created(
      new RegisterResponseDto(resp),
      'User registered successfully. Please check your email to verify your account.',
    );
  }

  @Public()
  @Post('login-redis')
  async loginWithRedis(@Body() data: LoginDto, @Req() req: Request) {
    const resp = await this.authWithRedisService.login(data, req);
    return ResponseBuilder.success(resp, 'Login successful');
  }

  @Public()
  @Post('verify-redis')
  async verifyWithRedis(@Body() data: VerifyOtpWithRedisDto) {
    const resp = await this.authWithRedisService.verify(data);
    return ResponseBuilder.created(resp, 'User verified successfully.');
  }

  @Public()
  @Post('resend-otp-redis')
  async resendOtpWithRedis(@Body() data: ResendVerificationEmailDto) {
    const user = await this.authWithRedisService.resendOtp(data);
    return ResponseBuilder.created(
      user,
      'Verification OTP resent successfully. Please check your email.',
    );
  }

  @Public()
  @Post('forgot-password-redis')
  async forgotPasswordOtpWithRedis(@Body() data: ForgotPasswordDto) {
    const resp = await this.authWithRedisService.forgotPassword(data);
    return ResponseBuilder.created(
      resp,
      'Verification OTP resent successfully. Please check your email.',
    );
  }

  @Public()
  @Post('reset-password-redis')
  async resetPasswordOtpWithRedis(@Body() data: ResetPasswordWithRedisDto) {
    const resp = await this.authWithRedisService.resetPassword(data);
    return ResponseBuilder.created(resp, 'Password reset successfully.');
  }

  @Post('logout-redis')
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

  @Post('logout-all-redis')
  async logoutAllWithRedis(@CurrentUser() user: { sub: string }) {
    await this.authWithRedisService.logoutAllDevices(user.sub);
    return ResponseBuilder.success(
      null,
      'Logged out from all devices successfully.',
    );
  }

  @Post('refresh-token-redis')
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

  // Standard auth flow without Redis caching - retains database persistence for OTPs and verification tokens
  @ApiOperation({
    summary: 'Register a new account',
    description:
      'Creates a user account and sends email verification credentials (OTP + verification link). The verification token and OTP expire after 15 minutes. Passwords are securely hashed using the Argon2 algorithm before storage.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered and verification email sent.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid registration data.',
    type: APIValidationErrorResponse,
  })
  @Public()
  @Post('register')
  async register(@Body() data: CreateUserDto) {
    const user = await this.authService.register(data);
    return ResponseBuilder.created(
      user,
      'User registered successfully. Please check your email to verify your account.',
    );
  }

  @ApiPublicAuthRoute(
    'User Login',
    'Validates credentials and returns access and refresh tokens with a sanitized user profile.',
  )
  @Public()
  @Post('login')
  async login(@Body() data: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(data, req);
    return ResponseBuilder.success(result, 'Login successful');
  }

  @ApiOperation({
    summary: 'Verify account via OTP payload',
    description:
      'Verify email address using token and 6-digit OTP code sent during signup. Marks email as activated, sends welcome email, and clears verification data.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account verified successfully.',
    type: VerifyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'OTP/token is invalid, expired, or used.',
    type: APIValidationErrorResponse,
  })
  @Public()
  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verify(dto);
    return ResponseBuilder.success(result, 'Account verified successfully');
  }

  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Re-issues verification token and OTP for a non-activated user.',
  })
  @ApiBody({ type: ResendVerificationEmailDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent successfully.',
    type: ResendVerificationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data.',
    type: APIValidationErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Account is already verified.',
  })
  @Public()
  @Post('resend-verification')
  async resendVerificationLink(@Body() dto: ResendVerificationEmailDto) {
    await this.authService.resendVerificationLink(dto);
    return ResponseBuilder.success(
      null,
      'Verification email resent successfully',
    );
  }

  @ApiOperation({
    summary: 'Initiate password reset',
    description: 'Sends password reset OTP and link to the user email.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent successfully.',
    type: ResendVerificationResponseDto,
  })
  @ApiForbiddenResponse({ description: 'User account is not activated.' })
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    await this.authService.forgotPassword(data.email);
    return ResponseBuilder.success(
      null,
      'Password reset email sent successfully',
    );
  }

  @ApiOperation({
    summary: 'Complete password reset',
    description:
      'Resets account password using valid password-reset token and OTP.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully.',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'OTP/token is invalid, expired, or used.',
    type: APIValidationErrorResponse,
  })
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto) {
    await this.authService.resetPassword(data);
    return ResponseBuilder.success(null, 'Password reset successfully');
  }

  @ApiOperation({
    summary: 'Rotate access and refresh tokens',
    description: 'Validates a refresh token and returns a new token pair.',
  })
  @ApiBearerAuth('refresh-token')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully.',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or malformed refresh token.',
  })
  @ApiForbiddenResponse({ description: 'Refresh token is invalid or expired.' })
  @UseGuards(JWTRefreshTokenGuard)
  @Post('refresh-token')
  async refreshTokens(@GetToken() refreshToken: string) {
    const result = await this.authService.refreshTokens(refreshToken);
    return ResponseBuilder.success(result, 'Tokens refreshed successfully');
  }

  @ApiOperation({
    summary: 'Logout current device session',
    description:
      'Invalidates the current session represented by the provided refresh token.',
  })
  @ApiBearerAuth('refresh-token')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or malformed refresh token.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: { jti: string }) {
    await this.authService.logout(user.jti);
    return ResponseBuilder.success(null, 'Logged out successfully');
  }

  @ApiOperation({
    summary: 'Logout all active sessions',
    description: 'Invalidates all sessions for the current user.',
  })
  @ApiBody({ type: LogoutAllDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully.',
    type: LogoutResponseDto,
  })
  @ApiBearerAuth('refresh-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: { sub: { id: string } }) {
    await this.authService.logoutAllDevices(user.sub.id);
    return ResponseBuilder.success(null, 'Logged out successfully');
  }
}
