import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSessionDto } from './dto/session.dto';
import { UserSession } from './entity/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
  ) {}

  async createSession(input: UserSessionDto) {
    await this.userSessionRepository.save(
      this.userSessionRepository.create({
        user: { id: input.userId },
        jti: input.jti,
        deviceInfo: input.deviceInfo || 'unknown',
        ipAddress: input.ipAddress || 'unknown',
        expiresAt:
          input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );
  }

  async deleteSessionByJti(jti: string) {
    await this.userSessionRepository.delete({ jti });
  }

  async deleteSessionsByUserId(userId: string) {
    await this.userSessionRepository.delete({ user: { id: userId } });
  }

  async findSessionsByUserId(userId: string) {
    return await this.userSessionRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findSessionByJti(jti: string) {
    return await this.userSessionRepository.findOne({
      where: { jti },
      relations: ['user'],
    });
  }
}
