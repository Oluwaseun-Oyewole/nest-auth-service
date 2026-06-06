import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Request } from 'express';
import * as crypto from 'node:crypto';
import * as requestIp from 'request-ip';
import { MailServiceService } from 'src/integration-services/mail-service/mail-service.service';
import { SessionsService } from 'src/psql-sessions/sessions.service';
import { TOKEN_TYPES } from 'src/psql-tokens/entity/user-token.entity';
import { UserTokensService } from 'src/psql-tokens/user-tokens.service';
import {
  BadRequestException,
  ForbiddenException,
  InvalidCredentialsException,
  ResourceNotFoundException,
} from 'src/shared/exceptions/domain.exceptions';
import {
  generateOtp,
  generateToken,
  hashToken,
} from 'src/shared/utils/index.utils';
import {
  CreateUserDto,
  LoginDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from 'src/user/dto/user.dto';
import { UsersService } from 'src/user/user.service';
import { DataSource } from 'typeorm';
import { ResendVerificationEmailDto } from './../user/dto/user.dto';
import { JWTPayload } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly mailService: MailServiceService,
    private readonly jwtService: JwtService,
    private readonly userTokensService: UserTokensService,
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionsService,
    private readonly dataSource: DataSource,
  ) {}

  async register(data: CreateUserDto) {
    const emailVerificationToken = generateToken();
    const otp = generateOtp();

    const result = await this.dataSource.transaction(async (manager) => {
      const user = await this.userService.createUser({ ...data }, manager);

      await this.userTokensService.createVerificationToken(
        {
          userId: user.id,
          token: emailVerificationToken,
          otpCode: otp,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          type: TOKEN_TYPES.EMAIL_VERIFICATION,
        },
        manager,
      );
      return { token: emailVerificationToken, email: data.email };
    });

    await this.sendEmailVerificationLink(data.email, data.fullname);

    return result;
  }

  async login(data: LoginDto, request: Request) {
    const user = await this.userService.findUserWithPassword(data.email);
    if (!user) throw new ResourceNotFoundException('User', data.email);

    if (!user.activatedAt) {
      await this.sendEmailVerificationLink(user.email, user.fullname);
      throw new ForbiddenException(
        'Your account is not activated. A new verification email has been sent to your inbox.',
        'ACTIVATION_REQUIRED',
      );
    }

    const isPasswordValid = await argon2.verify(user.password, data.password);
    if (!isPasswordValid) throw new InvalidCredentialsException();

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
    });

    const decode = await this.jwtService.decode(accessToken);

    user.password = undefined;

    await this.sessionsService.createSession({
      userId: user.id,
      jti: decode.jti,
      deviceInfo: request.headers['user-agent'],
      ipAddress: requestIp.getClientIp(request),
    });
    await this.userService.updateLoginTimestamp(user.id);
    return { accessToken, refreshToken, user };
  }

  async verify(input: VerifyOtpDto) {
    const verificationToken =
      await this.userTokensService.checkVerificationTokenIsValid(input.token);
    if (!verificationToken)
      throw new ResourceNotFoundException('Token', input.token);

    if (verificationToken.usedAt)
      throw new ForbiddenException('Token has already been used');

    const user = await this.userService.activateUser({
      email: verificationToken.user.email,
    });

    if (!user)
      throw new ResourceNotFoundException('User', verificationToken.user.email);

    if (verificationToken.user.activatedAt)
      throw new ForbiddenException('User is already activated');

    await this.userTokensService.deleteAllVerificationTokens({
      id: verificationToken.user.id,
    });

    await this.userTokensService.markTokenAsUsed(input.token);
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findUserByEmail(email);
    if (!user) throw new ResourceNotFoundException('User', email);
    if (!user.activatedAt) {
      await this.sendEmailVerificationLink(email, user.fullname);
      throw new ForbiddenException('User account is not activated');
    }

    const resetToken = generateToken();
    const otp = generateOtp();
    const resetLink = `${this.configService.get<string>('APP_URL')}/reset-password/?otp=${otp}&token=${resetToken}`;

    await this.userTokensService.createVerificationToken({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      otpCode: otp,
      type: TOKEN_TYPES.PASSWORD_RESET,
    });

    await this.mailService.sendPasswordResetEmail({
      to: email,
      name: user.fullname,
      email,
      otp,
      verificationLink: resetLink,
    });
  }

  async resetPassword(input: ResetPasswordDto) {
    const verificationToken =
      await this.userTokensService.checkVerificationTokenIsValid(input.token);

    if (!verificationToken)
      throw new ResourceNotFoundException('Token', input.token);

    if (verificationToken.usedAt)
      throw new ForbiddenException('Token has already been used');

    const user = await this.userService.findUserWithPassword(
      verificationToken.user.email,
    );

    if (!user)
      throw new ResourceNotFoundException('User', verificationToken.user.email);

    if (user.password && (await argon2.verify(user.password, input.password))) {
      throw new ForbiddenException(
        'New password cannot be the same as the old password',
      );
    }

    await this.userTokensService.markTokenAsUsed(input.token);
    const hashedPassword = await argon2.hash(input.password);
    await this.userService.updateUserPassword({
      userId: user.id,
      newPassword: hashedPassword,
    });

    await this.sessionsService.deleteSessionsByUserId(user.id);
  }

  async resendVerificationLink(input: ResendVerificationEmailDto) {
    const user = await this.userService.findUserByEmail(input.email);
    if (!user) throw new ResourceNotFoundException('User', input.email);

    if (user.activatedAt)
      throw new ForbiddenException('User is already activated');

    const emailVerificationToken = generateToken();
    const otp = generateOtp();

    await this.userTokensService.createVerificationToken({
      userId: user.id,
      token: emailVerificationToken,
      otpCode: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
    });

    await this.sendEmailVerificationLink(user.email, user.fullname);
  }

  async logout(jti: string) {
    const session = await this.sessionsService.findSessionByJti(jti);
    if (!session) return;

    await this.sessionsService.deleteSessionByJti(jti);
  }
  async logoutAllDevices(userId: string) {
    await this.sessionsService.deleteSessionsByUserId(userId);
  }

  async refreshTokens(refreshToken: string) {
    let decoded: { sub: JWTPayload; jti: string };

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        const decoded = this.jwtService.decode(refreshToken) as {
          sub: JWTPayload;
          jti: string;
        };
        if (!decoded?.jti) throw new BadRequestException('Malformed token');
        await this.sessionsService.deleteSessionByJti(decoded.jti);
        throw new ForbiddenException('Refresh token has expired');
      }
      throw new ForbiddenException('Invalid refresh token');
    }

    const session = await this.sessionsService.findSessionByJti(decoded.jti);
    if (!session) throw new ForbiddenException('Invalid Session');

    const accessAndRefreshTokens = await this.generateTokens({
      id: decoded.sub.id,
    });

    const newDecoded = await this.jwtService.decode(
      accessAndRefreshTokens.accessToken,
    );

    await this.sessionsService.deleteSessionByJti(decoded.jti);

    await this.sessionsService.createSession({
      userId: decoded.sub.id,
      jti: newDecoded.jti,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return accessAndRefreshTokens;
  }

  private async generateTokens(payload: JWTPayload) {
    const token = crypto.randomBytes(36).toString('hex');
    const jti = hashToken(token);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: { ...payload } },
        {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
          jwtid: jti,
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRES'),
          issuer: this.configService.get<string>('APP_NAME'),
        },
      ),
      this.jwtService.signAsync(
        { sub: { ...payload } },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'),
          jwtid: jti,
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES'),
          issuer: this.configService.get<string>('APP_NAME'),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async sendEmailVerificationLink(email: string, fullname: string) {
    const emailVerificationToken = generateToken();
    const otp = generateOtp();
    const verificationLink = `${this.configService.get<string>('APP_URL')}/verify/?otp=${otp}&token=${emailVerificationToken}`;

    await this.mailService.sendVerificationEmailWithResend({
      to: email,
      name: fullname,
      email,
      otp,
      verificationLink,
    });
  }
}
