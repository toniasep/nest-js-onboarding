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

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createDto: CreateEventDto): Promise<Event> {
    return this.eventsService.create(createDto);
  }

  // Public endpoint dengan Redis Caching (hanya event yang isPublished = true)
  @UseInterceptors(CacheInterceptor)
  @Get()
  findAll(@Query() listDto: ListEventDto): Promise<PaginatedResponse<Event>> {
    return this.eventsService.findAll(listDto, true);
  }

  // Endpoint khusus Admin untuk melihat semua event (termasuk draft)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  findAllAdmin(
    @Query() listDto: ListEventDto,
  ): Promise<PaginatedResponse<Event>> {
    return this.eventsService.findAll(listDto, false);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Event> {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEventDto,
  ): Promise<Event> {
    return this.eventsService.update(id, updateDto);
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
  togglePublish(@Param('id', ParseUUIDPipe) id: string): Promise<Event> {
    return this.eventsService.togglePublish(id);
  }
}
