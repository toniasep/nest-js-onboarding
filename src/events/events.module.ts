import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Event } from './entities/event.entity.js';
import { EventCategoriesModule } from '../event-categories/event-categories.module.js';
import { EventReminderCron } from './event-reminder.cron.js';
import { Ticket } from '../tickets/entities/ticket.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Ticket]),
    EventCategoriesModule,
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventReminderCron],
  exports: [EventsService],
})
export class EventsModule {}
