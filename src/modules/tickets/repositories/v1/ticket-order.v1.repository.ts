import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../../infrastructures/databases/entities/order.entity.js';

@Injectable()
export class TicketOrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async findByIdWithRelations(orderId: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id: orderId },
      relations: { user: true, event: true },
    });
  }
}
