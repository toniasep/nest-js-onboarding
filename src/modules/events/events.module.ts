import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Event } from './entities/event.entity.js';
import { Ticket } from '../tickets/entities/ticket.entity.js';
import { EventCategoriesModule } from '../event-categories/event-categories.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EventReminderCron } from './event-reminder.cron.js';
import { EventRepository } from './repositories/event.repository.js';
import { ReminderTicketRepository } from './repositories/reminder-ticket.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Ticket]),
    EventCategoriesModule,
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventReminderCron,
    EventRepository,
    ReminderTicketRepository,
  ],
  exports: [EventsService],
})
export class EventsModule {}
