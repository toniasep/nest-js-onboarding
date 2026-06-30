import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './controllers/v1/events.v1.controller.js';
import { EventsService } from './services/v1/events.v1.service.js';
import { Event } from '../../infrastructures/databases/entities/event.entity.js';
import { Ticket } from '../../infrastructures/databases/entities/ticket.entity.js';
import { EventCategoriesModule } from '../event-categories/event-categories.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EventReminderCron } from './event-reminder.cron.js';
import { EventRepository } from './repositories/v1/events.v1.repository.js';
import { ReminderTicketRepository } from './repositories/v1/reminder-ticket.v1.repository.js';

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
