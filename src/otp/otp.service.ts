import { Injectable } from '@nestjs/common';
import { REDIS_KEYS, REDIS_TTL } from 'src/redis/redis.constants';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '../shared/exceptions/domain.exceptions';
import { generateOtp } from '../shared/utils/index.utils';

const MAX_OTP_ATTEMPTS = 5;

interface OtpPayload {
  code: string;
  attempts: number;
  createdAt: number;
  verifyToken?: string;
}

@Injectable()
export class OtpService {
  constructor(private readonly redisService: RedisService) {}

  async generateOtp_(
    key: string,
  ): Promise<{ otp: string; verifyToken: string }> {
    const code = generateOtp();
    const verifyToken = uuidv4();

    const otpPayload = {
      code,
      attempts: 0,
      createdAt: Date.now(),
      verifyToken,
    };

    await Promise.all([
      this.redisService.set(key, otpPayload, REDIS_TTL.OTP),

      this.redisService.set(
        REDIS_KEYS.VERIFY_EMAIL_TOKEN(verifyToken),
        verifyToken,
        REDIS_TTL.OTP,
      ),
    ]);
    return { otp: code, verifyToken };
  }

  async verifyOtp(key: string, otp: string): Promise<void> {
    const storedOtp = await this.redisService.get<OtpPayload>(key);

    if (!storedOtp)
      throw new BadRequestException('OTP expired or does not exist');

    if (storedOtp.attempts >= MAX_OTP_ATTEMPTS) {
      await Promise.all([
        this.redisService.del(key),
        this.redisService.del(
          REDIS_KEYS.VERIFY_EMAIL_TOKEN(storedOtp.verifyToken),
        ),
      ]);
      throw new BadRequestException('Too many attempts. Request a new OTP.');
    }

    if (storedOtp.code !== otp) {
      storedOtp.attempts += 1;
      await this.redisService.set(key, storedOtp, REDIS_TTL.OTP);
      const remaining = MAX_OTP_ATTEMPTS - storedOtp.attempts;
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      );
    }

    await this.redisService.del(key);
    await this.redisService.del(
      REDIS_KEYS.VERIFY_EMAIL_TOKEN(storedOtp.verifyToken),
    );
  }

  async generateRegistrationOtp(
    email: string,
  ): Promise<{ otp: string; verifyToken: string }> {
    return this.generateOtp_(REDIS_KEYS.OTP_REGISTER(email));
  }
  async generateResetOtp(
    email: string,
  ): Promise<{ otp: string; verifyToken: string }> {
    return this.generateOtp_(REDIS_KEYS.OTP_RESET(email));
  }

  async verifyRegistrationOtp(email: string, otp: string): Promise<void> {
    return this.verifyOtp(REDIS_KEYS.OTP_REGISTER(email), otp);
  }

  async verifyResetOtp(email: string, otp: string): Promise<void> {
    return this.verifyOtp(REDIS_KEYS.OTP_RESET(email), otp);
  }
}
