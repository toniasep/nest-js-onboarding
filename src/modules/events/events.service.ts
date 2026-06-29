import { Injectable, NotFoundException } from '@nestjs/common';
import { Event } from './entities/event.entity.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { ListEventDto } from './dto/list-event.dto.js';
import { EventCategoriesService } from '../event-categories/event-categories.service.js';
import { EventRepository } from './repositories/event.repository.js';
import { PaginatedResponse } from '../../common/utils/pagination.util.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  async create(createDto: CreateEventDto): Promise<Event> {
    await this.eventCategoriesService.findOne(createDto.categoryId);
    return this.eventRepository.create(createDto);
  }

  async findAll(
    listDto: ListEventDto,
    isPublic: boolean = false,
  ): Promise<PaginatedResponse<Event>> {
    return this.eventRepository.findAll(listDto, isPublic);
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    if (updateDto.categoryId && updateDto.categoryId !== event.categoryId) {
      await this.eventCategoriesService.findOne(updateDto.categoryId);
    }
    Object.assign(event, updateDto);
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }

  async togglePublish(id: string): Promise<Event> {
    const event = await this.findOne(id);
    event.isPublished = !event.isPublished;
    return this.eventRepository.save(event);
  }
}
