import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../../infrastructures/databases/entities/order.entity.js';
import { IOrder } from '../../../../infrastructures/databases/interfaces/order.interface.js';

@Injectable()
export class TicketOrderRepository extends Repository<IOrder> {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<IOrder>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByIdWithRelations(orderId: string): Promise<IOrder | null> {
    return this.findOne({
      where: { id: orderId },
      relations: { user: true, event: true },
    });
  }
}
