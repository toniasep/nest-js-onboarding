import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { QueueName } from '../../../../shared/enums/queue-name.enum.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus } from '../../../../shared/enums/order-status.enum.js';
import {
  SendTicketEmailDto,
  SendPaymentNotificationDto,
  SendEventReminderDto,
} from '../../dtos/requests/v1/notification-queue.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly mailerService: MailerService,
    @InjectQueue(QueueName.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Enqueue job for sending ticket email
   */
  async enqueueTicketEmail(
    orderId: string,
    email: string,
    name: string,
    eventTitle: string,
    ticketUrls: string[],
  ): Promise<void> {
    const dto: SendTicketEmailDto = {
      orderId,
      email,
      name,
      eventTitle,
      ticketUrls,
    };
    await this.notificationsQueue.add('send-ticket-email', dto);
    this.logger.log(`Enqueued ticket email for order ${orderId} to ${email}`);
  }

  /**
   * Enqueue job for payment notification
   */
  async enqueuePaymentNotification(
    orderId: string,
    email: string,
    name: string,
    status: OrderStatus,
  ): Promise<void> {
    const dto: SendPaymentNotificationDto = { orderId, email, name, status };
    await this.notificationsQueue.add('send-payment-notification', dto);
    this.logger.log(
      `Enqueued payment notification for order ${orderId} (Status: ${status})`,
    );
  }

  /**
   * Enqueue job for event reminder
   */
  async enqueueEventReminder(
    email: string,
    name: string,
    eventTitle: string,
    eventDate: string,
    location: string,
  ): Promise<void> {
    const dto: SendEventReminderDto = {
      email,
      name,
      eventTitle,
      eventDate,
      location,
    };
    await this.notificationsQueue.add('send-event-reminder', dto);
    this.logger.log(
      `Enqueued event reminder for ${email} (Event: ${eventTitle})`,
    );
  }

  /**
   * Process Send Ticket Email
   */
  async sendTicketEmail(data: SendTicketEmailDto): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: `Your Tickets for ${data.eventTitle}`,
        template: './payment-success', // refers to payment-success.hbs
        context: {
          name: data.name,
          eventTitle: data.eventTitle,
          orderId: data.orderId,
          ticketUrls: data.ticketUrls,
        },
      });
      this.logger.log(`Successfully sent ticket email to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket email to ${data.email}`, error);
      throw error;
    }
  }

  /**
   * Process Send Payment Notification
   */
  async sendPaymentNotification(
    data: SendPaymentNotificationDto,
  ): Promise<void> {
    try {
      if (data.status === OrderStatus.EXPIRED) {
        await this.mailerService.sendMail({
          to: data.email,
          subject: `Order Expired - ${data.orderId}`,
          template: './order-expired', // refers to order-expired.hbs
          context: {
            name: data.name,
            orderId: data.orderId,
          },
        });
        this.logger.log(
          `Successfully sent order expired email to ${data.email}`,
        );
      }
      // For PAID status, the ticket email will handle it (or we can send a separate payment success).
      // Based on checklist: "Template: Payment Successful + Download Link Tiket"
      // So ticket email serves as payment successful. We only need order expired here.
    } catch (error) {
      this.logger.error(
        `Failed to send payment notification to ${data.email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process Send Event Reminder
   */
  async sendEventReminder(data: SendEventReminderDto): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: `Reminder: ${data.eventTitle} is tomorrow!`,
        template: './event-reminder', // refers to event-reminder.hbs
        context: {
          name: data.name,
          eventTitle: data.eventTitle,
          eventDate: data.eventDate,
          location: data.location,
        },
      });
      this.logger.log(`Successfully sent event reminder to ${data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send event reminder to ${data.email}`,
        error,
      );
      throw error;
    }
  }
}
