import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EventCategory } from '../entities/event-category.entity.js';
import { ListEventCategoryDto } from '../dto/list-event-category.dto.js';
import { PaginatedResponse } from '../../../common/utils/pagination.util.js';

@Injectable()
export class EventCategoryRepository {
  constructor(
    @InjectRepository(EventCategory)
    private readonly repo: Repository<EventCategory>,
  ) {}

  async create(data: Partial<EventCategory>): Promise<EventCategory> {
    const category = this.repo.create(data);
    return this.repo.save(category);
  }

  async findAll(
    listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<EventCategory>> {
    const { page, limit, search, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;
    const where = search ? { name: Like(`%${search}%`) } : {};

    const [data, total] = await this.repo.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<EventCategory | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(category: EventCategory): Promise<EventCategory> {
    return this.repo.save(category);
  }

  async remove(category: EventCategory): Promise<void> {
    await this.repo.remove(category);
  }
}
