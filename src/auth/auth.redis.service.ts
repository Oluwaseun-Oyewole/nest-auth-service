import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Request } from 'express';
import { MailServiceService } from 'src/integration-services/mail-service/mail-service.service';
import { OtpService } from 'src/redis-otp/otp.service';
import { RedisSessionsService } from 'src/redis-sessions/redis-sessions.service';
import { TokenPayload, TokenService } from 'src/redis-token/token.service';
import {
  BadRequestException,
  ForbiddenException,
  InvalidCredentialsException,
  ResourceNotFoundException,
} from 'src/shared/exceptions/domain.exceptions';
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
    await this.sendEmailVerificationLink(data.email, data.fullname);
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

    const { accessToken, refreshToken } = await this.tokenService.issueToken(
      user.id,
      session.sessionId,
    );

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

    await this.mailService.sendVerificationEmail({
      to: input.email,
      name: user.fullname,
      email: input.email,
      otp,
      verificationLink: `${this.configService.get<string>('APP_URL')}/reset-password/?otp=${otp}&token=${verifyToken}`,
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
    await this.sendEmailVerificationLink(input.email, user.fullname);
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

  async refreshTokens(refreshToken: string) {
    let decoded: TokenPayload;

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        const decoded = this.jwtService.decode(refreshToken) as TokenPayload;
        if (!decoded?.sub || !decoded?.sessionId || !decoded?.family)
          throw new BadRequestException('Malformed token');
        await Promise.all([
          this.redisSessionsService.revoke(decoded.sessionId, decoded.sub),
          this.tokenService.revokeTokenFamily(decoded.sub, decoded.family),
        ]);
        throw new ForbiddenException('Refresh token has expired');
      }
      throw new ForbiddenException('Invalid refresh token');
    }

    const verifyRecord = await this.tokenService.verifyRefreshToken(
      decoded.sub,
      refreshToken,
      decoded.family,
    );

    if (verifyRecord !== 'valid') {
      await Promise.all([
        this.redisSessionsService.revoke(decoded.sessionId, decoded.sub),
        this.tokenService.revokeTokenFamily(decoded.sub, decoded.family),
      ]);

      if (verifyRecord === 'mismatch') {
        throw new ForbiddenException('Refresh token reuse detected');
      }

      throw new ForbiddenException('Refresh token revoked');
    }

    const currentSession = await this.redisSessionsService.getSession(
      decoded.sessionId,
    );

    if (!currentSession) throw new ForbiddenException('Session not found');

    const accessAndRefreshTokens = await this.tokenService.issueToken(
      decoded.sub,
      decoded.sessionId,
      decoded.family,
    );

    return {
      ...accessAndRefreshTokens,
    };
  }

  async sendEmailVerificationLink(email: string, name: string, link?: string) {
    const { otp, verifyToken } =
      await this.otpService.generateRegistrationOtp(email);
    const verificationLink =
      link ||
      `${this.configService.get<string>('APP_URL')}/verify/?otp=${otp}&token=${verifyToken}`;

    await this.mailService.sendVerificationEmail({
      to: email,
      name,
      email,
      otp,
      verificationLink,
    });

    return {
      token: verifyToken,
      email,
    };
  }
}
