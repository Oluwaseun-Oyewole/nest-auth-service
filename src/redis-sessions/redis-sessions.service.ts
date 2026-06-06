import { Injectable } from '@nestjs/common';
import { REDIS_KEYS, REDIS_TTL } from 'src/redis/redis.constants';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  userId: string;
  sessionId: string;
  ip?: string;
  userAgent?: string;
  createAt?: string;
}

@Injectable()
export class RedisSessionsService {
  constructor(private readonly redisService: RedisService) {}

  async createSession(
    userId: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const sessionData: SessionData = {
      userId,
      sessionId,
      createAt: now,
      ...meta,
    };

    await Promise.all([
      this.redisService.set(
        REDIS_KEYS.SESSION(sessionId),
        sessionData,
        REDIS_TTL.SESSION,
      ),
      this.redisService.sadd(REDIS_KEYS.USER_SESSIONS(userId), sessionId),
    ]);

    return sessionData;
  }
  async getSession(sessionId: string) {
    const key = REDIS_KEYS.SESSION(sessionId);
    return this.redisService.get<SessionData>(key);
  }

  async revoke(sessionId: string, userId: string) {
    await Promise.all([
      this.redisService.srem(REDIS_KEYS.USER_SESSIONS(userId), sessionId),
      this.redisService.del(REDIS_KEYS.SESSION(sessionId)),
    ]);
  }

  async revokeAllSessions(userId: string) {
    const sessionIds = await this.redisService.smembers(
      REDIS_KEYS.USER_SESSIONS(userId),
    );
    if (sessionIds.length) {
      await this.redisService.del(
        ...sessionIds.map((id) => REDIS_KEYS.SESSION(id)),
        REDIS_KEYS.USER_SESSIONS(userId),
      );
    }
  }
}
