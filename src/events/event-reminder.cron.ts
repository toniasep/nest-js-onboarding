import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity.js';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class EventReminderCron {
  private readonly logger = new Logger(EventReminderCron.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly notificationsService: NotificationsService,
  ) { }

  // Run every day at midnight
  @Cron('* * * * *') // for testing
  async handleCron() {
    this.logger.debug('Running event reminder cron...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Set start and end of tomorrow
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Find all events happening tomorrow
    const events = await this.eventsRepository
      .createQueryBuilder('event')
      .where('event.eventDate >= :start', { start: startOfTomorrow })
      .andWhere('event.eventDate <= :end', { end: endOfTomorrow })
      .andWhere('event.isPublished = :isPublished', { isPublished: true })
      .getMany();

    this.logger.debug(`Found ${events.length} events happening tomorrow.`);

    for (const event of events) {
      // Find all active tickets for this event
      const tickets = await this.ticketsRepository.find({
        where: {
          eventId: event.id,
          status: TicketStatus.ACTIVE,
        },
        relations: { user: true },
      });

      this.logger.debug(`Sending ${tickets.length} reminders for event ${event.id}`);

      // We should use a Map or Set to prevent sending multiple emails to the same user if they bought multiple tickets
      const sentUserIds = new Set<string>();

      for (const ticket of tickets) {
        if (!sentUserIds.has(ticket.userId)) {
          await this.notificationsService.enqueueEventReminder(
            ticket.user.email,
            ticket.user.name,
            event.title,
            event.eventDate.toISOString(), // or format date
            event.location,
          );
          sentUserIds.add(ticket.userId);
        }
      }
    }
  }
}
