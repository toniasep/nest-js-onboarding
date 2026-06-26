import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EventCategory } from './entities/event-category.entity.js';
import { CreateEventCategoryDto } from './dto/create-event-category.dto.js';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto.js';
import { ListEventCategoryDto } from './dto/list-event-category.dto.js';

@Injectable()
export class EventCategoriesService {
  constructor(
    @InjectRepository(EventCategory)
    private readonly categoryRepository: Repository<EventCategory>,
  ) {}

  async create(createDto: CreateEventCategoryDto): Promise<EventCategory> {
    const category = this.categoryRepository.create(createDto);
    return this.categoryRepository.save(category);
  }

  async findAll(listDto: ListEventCategoryDto) {
    const { page, limit, search, sortBy, sortOrder } = listDto;
    const skip = (page - 1) * limit;

    const where = search ? { name: Like(`%${search}%`) } : {};

    const [data, total] = await this.categoryRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
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

  async findOne(id: string): Promise<EventCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
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
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}
