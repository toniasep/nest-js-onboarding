import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventCategoriesService } from './event-categories.service.js';
import { CreateEventCategoryDto } from './dto/create-event-category.dto.js';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto.js';
import { ListEventCategoryDto } from './dto/list-event-category.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { EventCategory } from './entities/event-category.entity.js';
import { PaginatedResponse } from '../../common/utils/pagination.util.js';

@Controller('event-categories')
export class EventCategoriesController {
  constructor(
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createDto: CreateEventCategoryDto): Promise<EventCategory> {
    return this.eventCategoriesService.create(createDto);
  }

  @Get()
  findAll(
    @Query() listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<EventCategory>> {
    return this.eventCategoriesService.findAll(listDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EventCategory> {
    return this.eventCategoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEventCategoryDto,
  ): Promise<EventCategory> {
    return this.eventCategoriesService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.eventCategoriesService.remove(id);
  }
}
