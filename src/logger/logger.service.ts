import { ConsoleLogger, Injectable } from '@nestjs/common';

const COLORS_GUIDE = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
} as const;

@Injectable()
export class AuthLogger extends ConsoleLogger {
  constructor() {
    super('Auth');
  }

  override log(message: string) {
    this.print('LOG', COLORS_GUIDE.green, message);
  }
  override warn(message: string) {
    this.print('WARN', COLORS_GUIDE.yellow, message);
  }
  override error(message: string, trace?: string) {
    this.print('ERROR', COLORS_GUIDE.red, message);
    if (trace)
      process.stderr.write(
        `${COLORS_GUIDE.gray}${trace}${COLORS_GUIDE.reset}\n`,
      );
  }

  loginAttempt(email: string) {
    this.log(`Login attempt — ${email}`);
  }
  loginSuccess(email: string) {
    this.log(`Login success — ${email}`);
  }
  loginFailed(email: string) {
    this.warn(`Login failed  — ${email}`);
  }
  tokenIssued(userId: string) {
    this.log(`Token issued  — user:${userId}`);
  }
  tokenExpired(userId: string) {
    this.warn(`Token expired — user:${userId}`);
  }
  tokenInvalid(reason: string) {
    this.warn(`Token invalid — ${reason}`);
  }
  unauthorized(path: string) {
    this.warn(`Unauthorized  — ${path}`);
  }
  loggedOut(userId: string) {
    this.log(`Logged out    — user:${userId}`);
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    ms: number,
  ): void {
    const getStatusColor = (code: number): string => {
      if (code >= 500) return COLORS_GUIDE.red;
      if (code >= 400) return COLORS_GUIDE.yellow;
      if (code >= 300) return COLORS_GUIDE.cyan;
      return COLORS_GUIDE.green;
    };

    const statusColor = getStatusColor(statusCode);

    const methodColor: Record<string, string> = {
      GET: COLORS_GUIDE.green,
      POST: COLORS_GUIDE.cyan,
      PUT: COLORS_GUIDE.yellow,
      PATCH: COLORS_GUIDE.yellow,
      DELETE: COLORS_GUIDE.red,
      OPTIONS: COLORS_GUIDE.gray,
    };

    const line = [
      `${COLORS_GUIDE.bold}${methodColor[method] ?? COLORS_GUIDE.white}${method.padEnd(7)}${COLORS_GUIDE.reset}`,
      `${COLORS_GUIDE.white}${url}${COLORS_GUIDE.reset}`,
      `${COLORS_GUIDE.bold}${statusColor}${statusCode}${COLORS_GUIDE.reset}`,
      `${COLORS_GUIDE.gray}+${ms}ms${COLORS_GUIDE.reset}`,
    ].join('  ');

    this.print('LOG', methodColor[method] ?? COLORS_GUIDE.white, line);
  }

  private print(level: string, color: string, message: string): void {
    const ts = new Date().toTimeString().slice(0, 8); // hh:mm:ss
    const out = `${COLORS_GUIDE.gray}${ts}${COLORS_GUIDE.reset}  ${color}${COLORS_GUIDE.bold} ${level.padEnd(5)}${COLORS_GUIDE.reset}  ${COLORS_GUIDE.bold}${COLORS_GUIDE.cyan}[Auth]${COLORS_GUIDE.reset}  ${color}${message}${COLORS_GUIDE.reset}\n`;
    level === 'ERROR' ? process.stderr.write(out) : process.stdout.write(out);
  }
}
