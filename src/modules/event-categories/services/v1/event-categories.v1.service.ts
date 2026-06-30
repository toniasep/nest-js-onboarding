import { Injectable, NotFoundException } from '@nestjs/common';
import { IEventCategory } from '../../../../infrastructures/databases/interfaces/event-category.interface.js';
import { CreateEventCategoryDto } from '../../dtos/requests/v1/create-event-category.dto.js';
import { UpdateEventCategoryDto } from '../../dtos/requests/v1/update-event-category.dto.js';
import { ListEventCategoryDto } from '../../dtos/requests/v1/list-event-category.dto.js';
import { EventCategoryRepository } from '../../repositories/v1/event-categories.v1.repository.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class EventCategoriesService {
  constructor(
    private readonly eventCategoryRepository: EventCategoryRepository,
  ) {}

  async create(createDto: CreateEventCategoryDto): Promise<IEventCategory> {
    const category = this.eventCategoryRepository.create(createDto);
    return this.eventCategoryRepository.save(category);
  }

  async findAll(
    listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<IEventCategory>> {
    return this.eventCategoryRepository.findAll(listDto);
  }

  async findOne(id: string): Promise<IEventCategory> {
    const category = await this.eventCategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Event Category with ID ${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateDto: UpdateEventCategoryDto,
  ): Promise<IEventCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateDto);
    return this.eventCategoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.eventCategoryRepository.remove(category);
  }
}
