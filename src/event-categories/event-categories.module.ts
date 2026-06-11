import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventCategoriesController } from './event-categories.controller.js';
import { EventCategoriesService } from './event-categories.service.js';
import { EventCategory } from './entities/event-category.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventCategory])],
  controllers: [EventCategoriesController],
  providers: [EventCategoriesService],
  exports: [EventCategoriesService],
})
export class EventCategoriesModule {}
