import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginatedResult } from '../../common/utils/pagination.util.js';
import { Order } from './entities/order.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Request() req: { user: { id: string; email: string } },
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    const userId = req.user.id;
    const email = req.user.email;
    return this.ordersService.create(userId, createOrderDto, email);
  }

  @Get()
  async findAll(
    @Request() req: { user: { id: string } },
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.ordersService.findAllByUser(req.user.id, paginationDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.ordersService.findOne(id);
  }
}
