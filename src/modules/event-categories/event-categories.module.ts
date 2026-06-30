import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventCategoriesController } from './controllers/v1/event-categories.v1.controller.js';
import { EventCategoriesService } from './services/v1/event-categories.v1.service.js';
import { EventCategoryRepository } from './repositories/v1/event-categories.v1.repository.js';
import { EventCategory } from '../../infrastructures/databases/entities/event-category.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventCategory])],
  controllers: [EventCategoriesController],
  providers: [EventCategoriesService, EventCategoryRepository],
  exports: [EventCategoriesService],
})
export class EventCategoriesModule {}
