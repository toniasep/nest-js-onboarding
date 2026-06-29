import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginatedResult } from '../../common/utils/pagination.util.js';
import { Order } from './entities/order.entity.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.ordersService.findAllAdmin(paginationDto);
  }
}
