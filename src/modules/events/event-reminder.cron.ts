import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/services/v1/notifications.v1.service.js';
import { EventRepository } from './repositories/v1/events.v1.repository.js';
import { ReminderTicketRepository } from './repositories/v1/reminder-ticket.v1.repository.js';

@Injectable()
export class EventReminderCron {
  private readonly logger = new Logger(EventReminderCron.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly reminderTicketRepository: ReminderTicketRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('* * * * *')
  async handleCron(): Promise<void> {
    this.logger.debug('Running event reminder cron...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const events = await this.eventRepository.findEventsTomorrow(
      startOfTomorrow,
      endOfTomorrow,
    );
    this.logger.debug(`Found ${events.length} events happening tomorrow.`);

    for (const event of events) {
      const tickets =
        await this.reminderTicketRepository.findActiveTicketsByEventId(
          event.id,
        );
      this.logger.debug(
        `Sending ${tickets.length} reminders for event ${event.id}`,
      );

      const sentUserIds = new Set<string>();
      for (const ticket of tickets) {
        if (!sentUserIds.has(ticket.userId)) {
          await this.notificationsService.enqueueEventReminder(
            ticket.user!.email,
            ticket.user!.name,
            event.title,
            event.eventDate.toISOString(),
            event.location,
          );
          sentUserIds.add(ticket.userId);
        }
      }
    }
  }
}
