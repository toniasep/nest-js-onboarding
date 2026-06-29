import { Injectable, NotFoundException } from '@nestjs/common';
import { EventCategory } from './entities/event-category.entity.js';
import { CreateEventCategoryDto } from './dto/create-event-category.dto.js';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto.js';
import { ListEventCategoryDto } from './dto/list-event-category.dto.js';
import { EventCategoryRepository } from './repositories/event-category.repository.js';
import { PaginatedResponse } from '../../common/utils/pagination.util.js';

@Injectable()
export class EventCategoriesService {
  constructor(
    private readonly eventCategoryRepository: EventCategoryRepository,
  ) {}

  async create(createDto: CreateEventCategoryDto): Promise<EventCategory> {
    return this.eventCategoryRepository.create(createDto);
  }

  async findAll(
    listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<EventCategory>> {
    return this.eventCategoryRepository.findAll(listDto);
  }

  async findOne(id: string): Promise<EventCategory> {
    const category = await this.eventCategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Event Category with ID ${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateDto: UpdateEventCategoryDto,
  ): Promise<EventCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateDto);
    return this.eventCategoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.eventCategoryRepository.remove(category);
  }
}
