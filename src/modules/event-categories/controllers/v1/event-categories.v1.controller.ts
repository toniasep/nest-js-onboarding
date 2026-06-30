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
import { EventCategoriesService } from '../../services/v1/event-categories.v1.service.js';
import { CreateEventCategoryDto } from '../../dtos/requests/v1/create-event-category.dto.js';
import { UpdateEventCategoryDto } from '../../dtos/requests/v1/update-event-category.dto.js';
import { ListEventCategoryDto } from '../../dtos/requests/v1/list-event-category.dto.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { EventCategory } from '../../../../infrastructures/databases/entities/event-category.entity.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';

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
