import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications.service.js';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      if (job.name === 'send-ticket-email') {
        await this.notificationsService.sendTicketEmail(
          job.data as Parameters<
            typeof this.notificationsService.sendTicketEmail
          >[0],
        );
      } else if (job.name === 'send-payment-notification') {
        await this.notificationsService.sendPaymentNotification(
          job.data as Parameters<
            typeof this.notificationsService.sendPaymentNotification
          >[0],
        );
      } else if (job.name === 'send-event-reminder') {
        await this.notificationsService.sendEventReminder(
          job.data as Parameters<
            typeof this.notificationsService.sendEventReminder
          >[0],
        );
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
