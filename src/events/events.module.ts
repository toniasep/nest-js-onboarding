import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Event } from './entities/event.entity.js';
import { EventCategoriesModule } from '../event-categories/event-categories.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), EventCategoriesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
