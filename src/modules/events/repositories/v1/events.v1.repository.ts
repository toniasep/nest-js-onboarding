import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Event } from '../../../../infrastructures/databases/entities/event.entity.js';
import { IEvent } from '../../../../infrastructures/databases/interfaces/event.interface.js';
import { ListEventDto } from '../../dtos/requests/v1/list-event.dto.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class EventRepository extends Repository<IEvent> {
  constructor(
    @InjectRepository(Event)
    private readonly repo: Repository<IEvent>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findAll(
    listDto: ListEventDto,
    isPublic: boolean = false,
  ): Promise<PaginatedResponse<IEvent>> {
    const { page, limit, search, categoryId, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<IEvent> = {};

    if (search) where.title = Like(`%${search}%`);
    if (categoryId) where.categoryId = categoryId;
    if (isPublic) where.isPublished = true;

    const [data, total] = await this.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
      relations: { category: true },
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<IEvent | null> {
    return this.findOne({ where: { id }, relations: { category: true } });
  }

  async findEventsTomorrow(start: Date, end: Date): Promise<IEvent[]> {
    return this.createQueryBuilder('event')
      .where('event.eventDate >= :start', { start })
      .andWhere('event.eventDate <= :end', { end })
      .andWhere('event.isPublished = :isPublished', { isPublished: true })
      .getMany();
  }
}
