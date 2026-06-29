import { Module, forwardRef } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';

import { NotificationsService } from './notifications.service.js';
import { NotificationProcessor } from './processors/notification.processor.js';
import { QueueName } from '../../common/enums/queue-name.enum.js';
import { TicketsModule } from '../tickets/tickets.module.js';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('SMTP_HOST'),
          port: configService.get<number>('SMTP_PORT'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: configService.get(
            'SMTP_FROM',
            '"No Reply" <noreply@example.com>',
          ),
        },
        template: {
          dir: join(process.cwd(), 'src/notifications/templates'),
          adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
          options: {
            strict: true,
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: QueueName.NOTIFICATIONS,
    }),
    forwardRef(() => TicketsModule), // In case we need it
  ],
  providers: [NotificationsService, NotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
