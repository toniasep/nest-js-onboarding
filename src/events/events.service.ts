import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Event } from './entities/event.entity.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { ListEventDto } from './dto/list-event.dto.js';
import { EventCategoriesService } from '../event-categories/event-categories.service.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  async create(createDto: CreateEventDto): Promise<Event> {
    // Pastikan category exists (akan throw NotFound jika tidak ada)
    await this.eventCategoriesService.findOne(createDto.categoryId);

    const event = this.eventRepository.create(createDto);
    return this.eventRepository.save(event);
  }

  async findAll(listDto: ListEventDto, isPublic: boolean = false) {
    const { page, limit, search, categoryId, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Event> = {};
    
    if (search) {
      where.title = Like(`%${search}%`);
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isPublic) {
      where.isPublished = true;
    }

    const [data, total] = await this.eventRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
      relations: { category: true }, // Sertakan data kategori
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: { category: true },
    });

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
