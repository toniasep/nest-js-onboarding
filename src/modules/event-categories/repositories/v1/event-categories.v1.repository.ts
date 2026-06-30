import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EventCategory } from '../../../../infrastructures/databases/entities/event-category.entity.js';
import { IEventCategory } from '../../../../infrastructures/databases/interfaces/event-category.interface.js';
import { ListEventCategoryDto } from '../../dtos/requests/v1/list-event-category.dto.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class EventCategoryRepository extends Repository<IEventCategory> {
  constructor(
    @InjectRepository(EventCategory)
    private readonly repo: Repository<IEventCategory>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findAll(
    listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<IEventCategory>> {
    const { page, limit, search, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;
    const where = search ? { name: Like(`%${search}%`) } : {};

    const [data, total] = await this.findAndCount({
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

  async findById(id: string): Promise<IEventCategory | null> {
    return this.findOne({ where: { id } });
  }
}
