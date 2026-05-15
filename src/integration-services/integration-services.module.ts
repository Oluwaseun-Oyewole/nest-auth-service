import { Module } from '@nestjs/common';
import { MailServiceModule } from './mail-service/mail-service.module';

@Module({
  imports: [MailServiceModule],
})
export class IntegrationServicesModule {}
