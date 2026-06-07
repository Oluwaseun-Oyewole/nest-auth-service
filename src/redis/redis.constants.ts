export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_KEYS = {
  OTP_REGISTER: (email: string) => `otp:register:${email}`,
  OTP_RESET: (email: string) => `otp:reset:${email}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_SESSIONS: (userId: string) => `sessions:${userId}`,
  REFRESH_TOKEN: (userId: string, family: string) =>
    `refresh-token:${userId}:${family}`,
  USER_TOKEN_FAMILIES: (userId: string) => `token-families:${userId}`,
} as const;

export const REDIS_TTL = {
  OTP: 60 * 10,
  SESSION: 60 * 60 * 24 * 7,
  REFRESH_TOKEN: 60 * 60 * 24 * 7,
} as const;
