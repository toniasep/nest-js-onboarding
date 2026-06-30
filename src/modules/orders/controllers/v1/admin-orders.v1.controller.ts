import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from '../../services/v1/orders.v1.service.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { PaginationDto } from '../../../../shared/dtos/pagination.dto.js';
import { PaginatedResult } from '../../../../shared/utils/pagination.util.js';
import { Order } from '../../../../infrastructures/databases/entities/order.entity.js';

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
