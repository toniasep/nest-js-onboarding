import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications.service.js';
import {
  SendTicketEmailDto,
  SendPaymentNotificationDto,
  SendEventReminderDto,
} from '../dto/notification-queue.dto.js';

import { QueueName } from '../../../common/enums/queue-name.enum.js';

@Processor(QueueName.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      if (job.name === 'send-ticket-email') {
        const dto = job.data as SendTicketEmailDto;
        await this.notificationsService.sendTicketEmail(dto);
        this.logger.debug(`Processed ticket email for order ${dto.orderId}`);
      } else if (job.name === 'send-payment-notification') {
        const dto = job.data as SendPaymentNotificationDto;
        await this.notificationsService.sendPaymentNotification(dto);
        this.logger.debug(
          `Processed payment notification for order ${dto.orderId}`,
        );
      } else if (job.name === 'send-event-reminder') {
        const dto = job.data as SendEventReminderDto;
        await this.notificationsService.sendEventReminder(dto);
        this.logger.debug(`Processed event reminder for email ${dto.email}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
