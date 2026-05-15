import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Request } from 'express';
import { MailServiceService } from 'src/integration-services/mail-service/mail-service.service';
import { OtpService } from 'src/otp/otp.service';
import { RedisSessionsService } from 'src/redis-sessions/redis-sessions.service';
import {
  BadRequestException,
  ForbiddenException,
  InvalidCredentialsException,
  ResourceNotFoundException,
} from 'src/shared/exceptions/domain.exceptions';
import { TokenService } from 'src/token/token.service';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordWithRedisDto,
  VerifyOtpWithRedisDto,
} from 'src/user/dto/user.dto';
import { UsersService } from 'src/user/user.service';
import { ResendVerificationEmailDto } from './../user/dto/user.dto';

@Injectable()
export class AuthWithRedisService {
  constructor(
    private readonly userService: UsersService,
    private readonly mailService: MailServiceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly redisSessionsService: RedisSessionsService,
    private readonly tokenService: TokenService,
  ) {}

  async register(data: CreateUserDto) {
    await this.userService.createUser({ ...data });
    const { otp, verifyToken } = await this.otpService.generateRegistrationOtp(
      data.email,
    );
    const verificationLink = `${this.configService.get<string>('APP_URL')}/verify/?otp=${otp}&token=${verifyToken}`;

    await this.mailService.sendVerificationEmail({
      to: data.email,
      name: data.fullname,
      email: data.email,
      otp,
      verificationLink,
    });

    return {
      token: verifyToken,
      email: data.email,
    };
  }

  async login(data: LoginDto, request: Request) {
    const user = await this.userService.findUserWithPassword(data.email);
    if (!user) throw new ResourceNotFoundException('User', data.email);

    if (!user.activatedAt) {
      throw new ForbiddenException(
        'Your account is not activated. Please check your email for the activation details',
        'ACTIVATION_REQUIRED',
      );
    }

    const isPasswordValid = await argon2.verify(user.password, data.password);
    if (!isPasswordValid) throw new InvalidCredentialsException();

    await this.userService.updateLoginTimestamp(user.id);
    user.password = undefined;

    const session = await this.redisSessionsService.createSession(user.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    const { accessToken, refreshToken } =
      await this.tokenService.issueTokenPair(user.id, session.sessionId);

    return { accessToken, refreshToken, user };
  }

  async verify(input: VerifyOtpWithRedisDto) {
    await this.otpService.verifyRegistrationOtp(input.email, input.otp);

    const user = await this.userService.findUserByEmail(input.email);

    if (!user) throw new ResourceNotFoundException('User', input.email);

    if (user.activatedAt)
      throw new ForbiddenException('User already activated');

    await this.userService.activateUser({ email: input.email });
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const user = await this.userService.findUserByEmail(input.email);
    if (!user) throw new ResourceNotFoundException('User', input.email);
    if (!user.activatedAt)
      throw new ForbiddenException('User account is not activated');

    const { otp, verifyToken } = await this.otpService.generateResetOtp(
      input.email,
    );
    const resetLink = `${this.configService.get<string>('APP_URL')}/reset-password/?otp=${otp}&token=${verifyToken}`;

    await this.mailService.sendPasswordResetEmail({
      to: input.email,
      name: user.fullname,
      email: input.email,
      otp,
      verificationLink: resetLink,
    });
  }

  async resetPassword(input: ResetPasswordWithRedisDto) {
    await this.otpService.verifyResetOtp(input.email, input.otp);
    const user = await this.userService.findUserWithPassword(input.email);

    if (!user) throw new ResourceNotFoundException('User', input.email);

    if (user.password && (await argon2.verify(user.password, input.password))) {
      throw new ForbiddenException(
        'New password cannot be the same as the old password',
      );
    }

    const hashedPassword = await argon2.hash(input.password);
    await this.userService.updateUserPassword({
      userId: user.id,
      newPassword: hashedPassword,
    });
  }

  async resendOtp(input: ResendVerificationEmailDto) {
    const user = await this.userService.findUserByEmail(input.email);
    if (!user) throw new ResourceNotFoundException('User', input.email);

    if (user.activatedAt)
      throw new ForbiddenException('User is already activated');

    const { otp, verifyToken } = await this.otpService.generateRegistrationOtp(
      input.email,
    );
    const verificationLink = `${this.configService.get<string>('APP_URL')}/verify/?otp=${otp}&token=${verifyToken}`;

    await this.mailService.sendVerificationEmail({
      to: input.email,
      name: user.fullname,
      email: input.email,
      otp,
      verificationLink,
    });
  }

  async logout(userId: string, sessionId: string, family: string) {
    const currentDeviceSession =
      await this.redisSessionsService.getSession(sessionId);
    if (!currentDeviceSession) throw new ForbiddenException('Invalid session');
    await this.redisSessionsService.revoke(sessionId, userId);
    await this.tokenService.revokeTokenFamily(userId, family);
  }

  async logoutAllDevices(userId: string) {
    await Promise.all([
      this.redisSessionsService.revokeAllSessions(userId),
      this.tokenService.revokeAllFamilies(userId),
    ]);
  }

  async refreshTokens(refreshToken: string, family: string) {
    let decoded: { sub: string; jti: string; sessionId: string };

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        const decoded = this.jwtService.decode(refreshToken) as {
          sub: string;
          jti: string;
          sessionId: string;
        };
        if (!decoded?.jti) throw new BadRequestException('Malformed token');
        await this.redisSessionsService.revoke(decoded.sessionId, decoded.sub);
        throw new ForbiddenException('Refresh token has expired');
      }
      throw new ForbiddenException('Invalid refresh token');
    }

    const verifyRecord = await this.tokenService.verifyRefreshToken(
      decoded.sub,
      refreshToken,
      family,
    );

    if (!verifyRecord) {
      await this.redisSessionsService.revoke(decoded.sessionId, decoded.sub);
      throw new ForbiddenException('Refresh token revoked');
    }

    const currentSession = await this.redisSessionsService.getSession(
      decoded.sessionId,
    );

    if (!currentSession) throw new ForbiddenException('Session not found');

    const accessAndRefreshTokens = await this.tokenService.issueTokenPair(
      decoded.sub,
      decoded.sessionId,
    );

    await this.redisSessionsService.createSession(decoded.sub, {
      ip: currentSession.ip,
      userAgent: currentSession.userAgent,
    });

    await this.tokenService.revokeFamilyAndSession(
      decoded.sub,
      decoded.sessionId,
      family,
    );

    return {
      ...accessAndRefreshTokens,
    };
  }
}
