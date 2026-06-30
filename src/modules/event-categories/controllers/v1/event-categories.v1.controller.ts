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
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';
import { EventCategoryResponseDto } from '../../dtos/responses/v1/event-category-response.dto.js';

@Controller('event-categories')
export class EventCategoriesController {
  constructor(
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(
    @Body() createDto: CreateEventCategoryDto,
  ): Promise<EventCategoryResponseDto> {
    const data = await this.eventCategoriesService.create(createDto);
    return EventCategoryResponseDto.MapEntity(data);
  }

  @Get()
  async findAll(
    @Query() listDto: ListEventCategoryDto,
  ): Promise<PaginatedResponse<EventCategoryResponseDto>> {
    const result = await this.eventCategoriesService.findAll(listDto);
    return {
      meta: result.meta,
      data: EventCategoryResponseDto.MapEntities(result.data),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventCategoryResponseDto> {
    const data = await this.eventCategoriesService.findOne(id);
    return EventCategoryResponseDto.MapEntity(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEventCategoryDto,
  ): Promise<EventCategoryResponseDto> {
    const data = await this.eventCategoriesService.update(id, updateDto);
    return EventCategoryResponseDto.MapEntity(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.eventCategoriesService.remove(id);
  }
}
