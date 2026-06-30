import { Injectable, NotFoundException } from '@nestjs/common';
import { IEvent } from '../../../../infrastructures/databases/interfaces/event.interface.js';
import { CreateEventDto } from '../../dtos/requests/v1/create-event.dto.js';
import { UpdateEventDto } from '../../dtos/requests/v1/update-event.dto.js';
import { ListEventDto } from '../../dtos/requests/v1/list-event.dto.js';
import { EventCategoriesService } from '../../../event-categories/services/v1/event-categories.v1.service.js';
import { EventRepository } from '../../repositories/v1/events.v1.repository.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  async create(createDto: CreateEventDto): Promise<IEvent> {
    await this.eventCategoriesService.findOne(createDto.categoryId);
    const event = this.eventRepository.create(createDto);
    return this.eventRepository.save(event);
  }

  async findAll(
    listDto: ListEventDto,
    isPublic: boolean = false,
  ): Promise<PaginatedResponse<IEvent>> {
    return this.eventRepository.findAll(listDto, isPublic);
  }

  async findOne(id: string): Promise<IEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateDto: UpdateEventDto): Promise<IEvent> {
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

  async togglePublish(id: string): Promise<IEvent> {
    const event = await this.findOne(id);
    event.isPublished = !event.isPublished;
    return this.eventRepository.save(event);
  }
}
