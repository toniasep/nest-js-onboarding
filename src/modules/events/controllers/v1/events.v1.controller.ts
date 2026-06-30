import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { EventsService } from '../../services/v1/events.v1.service.js';
import { CreateEventDto } from '../../dtos/requests/v1/create-event.dto.js';
import { UpdateEventDto } from '../../dtos/requests/v1/update-event.dto.js';
import { ListEventDto } from '../../dtos/requests/v1/list-event.dto.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { Event } from '../../../../infrastructures/databases/entities/event.entity.js';
import { PaginatedResponse } from '../../../../shared/utils/pagination.util.js';
import { EventResponseDto } from '../../dtos/responses/v1/event-response.dto.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() createDto: CreateEventDto): Promise<EventResponseDto> {
    const data = await this.eventsService.create(createDto);
    return EventResponseDto.MapEntity(data);
  }

  // Public endpoint dengan Redis Caching (hanya event yang isPublished = true)
  @UseInterceptors(CacheInterceptor)
  @Get()
  async findAll(
    @Query() listDto: ListEventDto,
  ): Promise<PaginatedResponse<EventResponseDto>> {
    const result = await this.eventsService.findAll(listDto, true);
    return {
      meta: result.meta,
      data: EventResponseDto.MapEntities(result.data),
    };
  }

  // Endpoint khusus Admin untuk melihat semua event (termasuk draft)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  async findAllAdmin(
    @Query() listDto: ListEventDto,
  ): Promise<PaginatedResponse<EventResponseDto>> {
    const result = await this.eventsService.findAll(listDto, false);
    return {
      meta: result.meta,
      data: EventResponseDto.MapEntities(result.data),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto> {
    const data = await this.eventsService.findOne(id);
    return EventResponseDto.MapEntity(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const data = await this.eventsService.update(id, updateDto);
    return EventResponseDto.MapEntity(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.eventsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/publish')
  async togglePublish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto> {
    const data = await this.eventsService.togglePublish(id);
    return EventResponseDto.MapEntity(data);
  }
}
