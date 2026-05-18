import { MailerService } from '@nestjs-modules/mailer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { SendRegisterEmailDto } from './mail.dto';

@Injectable()
export class MailServiceService {
  private readonly logger = new Logger(MailServiceService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject('RESEND_CLIENT') private readonly resend: Resend,
  ) {}

  async sendVerificationEmail(input: SendRegisterEmailDto) {
    this.logger.log(`Sending verification email to ${input.to}`);
    try {
      await this.mailerService.sendMail({
        to: input.to,
        subject: 'Welcome to Our App! Please Verify Your Email',
        template: 'Verification',
        html: `<div>
        <p>Hello ${input.name},</p>
        <p>Welcome onboard.</p>
        <p>Enter your otp code ${input.otp}</p>
        <p>or use the verification link below to verify your email address</p>
        <p>Please verify your account with this link: <b>${input.verificationLink}</b></p>
      </div>`,
        context: {
          otp: input.otp,
          name: input.name,
          verificationLink: input.verificationLink,
          magicLink: input.verificationLink,
          expiresIn: '15 minutes',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${input.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendPasswordResetEmail(input: SendRegisterEmailDto) {
    try {
      await this.mailerService.sendMail({
        to: input.to,
        subject: 'Password Reset Request',
        template: 'PasswordReset',
        html: `<div>
        <p>Hello ${input.name},</p>
        <p>You requested a password reset. Please use the OTP code below to reset your password:</p>
        <p><b>${input.otp}</b></p>
        <p>or click the link below to reset your password:</p>
        <p><b>${input.verificationLink}</b></p>
        <p>This OTP code and link will expire in 15 minutes.</p>
      </div>`,
        context: {
          otp: input.otp,
          name: input.name,
          verificationLink: input.verificationLink,
          expiresIn: '15 minutes',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${input.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendVerificationEmailWithResend(input: SendRegisterEmailDto) {
    const mailOptions = {
      from: 'onboarding@resend.dev',
      to: input.to,
      subject: 'Welcome! Please Verify Your Email',
      html: `
      <div>
        <p>Hello ${input.name},</p>
        <p>Your otp code ${input.otp}</p>
        <p>or use the verification link below to verify your email address</p>
        <p>Please verify your account with this link: <b>${input.verificationLink}</b></p>
      </div>
      `,
      context: {
        otp: input.otp,
        name: input.name,
        verificationLink: input.verificationLink,
        magicLink: input.verificationLink,
        expiresIn: '15 minutes',
      },
    };
    try {
      return await this.resend.emails.send(mailOptions);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email with Resend to ${input.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
