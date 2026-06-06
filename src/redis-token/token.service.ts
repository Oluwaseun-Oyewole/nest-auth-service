import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { REDIS_KEYS, REDIS_TTL } from 'src/redis/redis.constants';
import { RedisService } from 'src/redis/redis.service';
import { hashToken } from 'src/shared/utils/index.utils';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPayload {
  sub: string;
  sessionId: string;
  family: string;
}

interface RefreshTokenRecord {
  tokenHash: string;
  sessionId: string;
  createdAt: string;
}

export type RefreshTokenVerificationResult = 'valid' | 'missing' | 'mismatch';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async issueToken(userId: string, sessionId: string, family?: string) {
    const { accessToken, refreshToken } = await this.createToken(
      userId,
      sessionId,
      family,
    );
    return { accessToken, refreshToken };
  }

  private async createToken(
    userId: string,
    sessionId: string,
    family?: string,
  ) {
    const familyId = family ?? uuidv4();

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.sign(
        { sub: userId, sessionId, family: familyId } satisfies TokenPayload,
        {
          secret: this.configService.get('JWT_SECRET_KEY'),
          expiresIn: this.configService.get<number>('JWT_ACCESS_EXPIRES'),
        },
      ),

      await this.jwtService.sign(
        { sub: userId, sessionId, family: familyId } satisfies TokenPayload,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET_KEY'),
          expiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRES'),
        },
      ),
    ]);
    const tokenHash = hashToken(refreshToken);

    const payload = {
      tokenHash,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    await Promise.all([
      this.redisService.set(
        REDIS_KEYS.REFRESH_TOKEN(userId, familyId),
        payload,
        REDIS_TTL.REFRESH_TOKEN,
      ),
      this.redisService.sadd(REDIS_KEYS.USER_TOKEN_FAMILIES(userId), familyId),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
    family: string,
  ): Promise<RefreshTokenVerificationResult> {
    const key = REDIS_KEYS.REFRESH_TOKEN(userId, family);
    const record = await this.redisService.get<RefreshTokenRecord>(key);

    if (!record) return 'missing';

    const tokenHash = hashToken(refreshToken);
    return tokenHash === record.tokenHash ? 'valid' : 'mismatch';
  }

  async revokeTokenFamily(userId: string, family: string) {
    await Promise.all([
      this.redisService.del(REDIS_KEYS.REFRESH_TOKEN(userId, family)),
      this.redisService.srem(REDIS_KEYS.USER_TOKEN_FAMILIES(userId), family),
    ]);
  }

  async revokeAllFamilies(userId: string) {
    const families = await this.redisService.smembers(
      REDIS_KEYS.USER_TOKEN_FAMILIES(userId),
    );
    if (families.length) {
      await this.redisService.del(
        ...families.map((f) => REDIS_KEYS.REFRESH_TOKEN(userId, f)),
        REDIS_KEYS.USER_TOKEN_FAMILIES(userId),
      );
    }
  }
}
