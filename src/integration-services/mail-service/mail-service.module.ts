import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { Resend } from 'resend';
import { MailServiceService } from './mail-service.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get('MAIL_PORT'),
          secure: false,
          family: 4,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: { from: config.get('MAIL_FROM') },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    MailServiceService,
    {
      provide: 'RESEND_CLIENT',
      useFactory: (config: ConfigService) =>
        new Resend(config.get('RESEND_API_KEY')),
      inject: [ConfigService],
    },
  ],
  exports: [MailServiceService],
})
export class MailServiceModule {}
