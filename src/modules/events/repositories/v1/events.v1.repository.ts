import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, Like, FindOptionsWhere } from 'typeorm';
import { Event } from '../../../../infrastructures/databases/entities/event.entity.js';
import { ListEventDto } from '../../dtos/requests/v1/list-event.dto.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repo: Repository<Event>,
  ) {}

  async create(data: DeepPartial<Event>): Promise<Event> {
    const event = this.repo.create(data);
    return this.repo.save(event);
  }

  async findAll(
    listDto: ListEventDto,
    isPublic: boolean = false,
  ): Promise<PaginatedResponse<Event>> {
    const { page, limit, search, categoryId, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Event> = {};

    if (search) where.title = Like(`%${search}%`);
    if (categoryId) where.categoryId = categoryId;
    if (isPublic) where.isPublished = true;

    const [data, total] = await this.repo.findAndCount({
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

  async findById(id: string): Promise<Event | null> {
    return this.repo.findOne({ where: { id }, relations: { category: true } });
  }

  async save(event: Event): Promise<Event> {
    return this.repo.save(event);
  }

  async remove(event: Event): Promise<void> {
    await this.repo.remove(event);
  }

  async findEventsTomorrow(start: Date, end: Date): Promise<Event[]> {
    return this.repo
      .createQueryBuilder('event')
      .where('event.eventDate >= :start', { start })
      .andWhere('event.eventDate <= :end', { end })
      .andWhere('event.isPublished = :isPublished', { isPublished: true })
      .getMany();
  }
}
