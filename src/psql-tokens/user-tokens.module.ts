import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationToken } from './entity/user-token.entity';
import { UserTokensService } from './user-tokens.service';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationToken])],
  providers: [UserTokensService],
  exports: [UserTokensService],
})
export class UserTokensModule {}
