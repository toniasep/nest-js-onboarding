import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Request() req: { user: { id: string; email: string } },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const userId = req.user.id;
    const email = req.user.email;
    return this.ordersService.create(userId, createOrderDto, email);
  }

  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.ordersService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }
}
