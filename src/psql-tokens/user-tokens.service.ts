import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ForbiddenException,
  TokenExpiredException,
} from 'src/shared/exceptions/domain.exceptions';
import { EntityManager, Repository } from 'typeorm';
import { VerificationToken } from './entity/user-token.entity';

@Injectable()
export class UserTokensService {
  constructor(
    @InjectRepository(VerificationToken)
    private readonly VerificationTokenRepository: Repository<VerificationToken>,
  ) {}

  async createVerificationToken(
    { userId, token, expiresAt, type, otpCode },
    manager?: EntityManager,
  ): Promise<VerificationToken> {
    const repo = manager
      ? manager.getRepository(VerificationToken)
      : this.VerificationTokenRepository;
    const tokenExists = await repo.findOne({
      where: { user: { id: userId } },
    });

    if (tokenExists) {
      await repo.delete({ user: { id: userId } });
    }

    const createUserToken = repo.create({
      user: { id: userId },
      token,
      expiresAt,
      type,
      otpCode,
    });
    await repo.save(createUserToken);
    return createUserToken;
  }
  async checkVerificationTokenIsValid(token: string) {
    const verificationToken = await this.VerificationTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!verificationToken)
      throw new ForbiddenException('Invalid or expired token', 'INVALID_TOKEN');

    if (verificationToken.usedAt)
      throw new ForbiddenException(
        'Token has already been used',
        'TOKEN_ALREADY_USED',
      );

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }
    return verificationToken;
  }

  async markTokenAsUsed(token: string) {
    await this.VerificationTokenRepository.update(
      { token },
      { usedAt: new Date() },
    );
  }

  async deleteAllVerificationTokens(input: { id: string | any }) {
    return await this.VerificationTokenRepository.delete({
      user: { id: input.id },
    });
  }
}
