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
import { OrdersService } from '../../services/v1/orders.v1.service.js';
import { CreateOrderDto } from '../../dtos/requests/v1/create-order.dto.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { PaginationDto } from '../../../../shared/dtos/pagination.dto.js';
import { PaginatedResult } from '../../../../shared/utils/pagination.util.js';
import { OrderResponseDto } from '../../dtos/responses/v1/order-response.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Request() req: { user: { id: string; email: string } },
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const userId = req.user.id;
    const email = req.user.email;
    const data = await this.ordersService.create(userId, createOrderDto, email);
    return OrderResponseDto.MapEntity(data);
  }

  @Get()
  async findAll(
    @Request() req: { user: { id: string } },
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const result = await this.ordersService.findAllByUser(
      req.user.id,
      paginationDto,
    );
    return {
      meta: result.meta,
      items: OrderResponseDto.MapEntities(result.items),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    const data = await this.ordersService.findOne(id);
    return OrderResponseDto.MapEntity(data);
  }
}
