import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Order } from '../../../../infrastructures/databases/entities/order.entity.js';
import { IOrder } from '../../../../infrastructures/databases/interfaces/order.interface.js';
import { PaginationDto } from '../../../../shared/dtos/pagination.dto.js';
import {
  paginate,
  PaginatedResult,
} from '../../../../shared/utils/pagination.util.js';

@Injectable()
export class OrderRepository extends Repository<IOrder> {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<IOrder>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findById(id: string): Promise<IOrder | null> {
    return this.findOne({
      where: { id },
      relations: { event: true, user: true },
    });
  }

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<IOrder | null> {
    return manager.getRepository(Order).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findAllByUser(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<IOrder>> {
    const qb = this.createQueryBuilder('order')
      .leftJoinAndSelect('order.event', 'event')
      .where('order.userId = :userId', { userId });

    if (paginationDto.search) {
      qb.andWhere('event.title ILIKE :search', {
        search: `%${paginationDto.search}%`,
      });
    }

    return paginate(qb, paginationDto, ['createdAt', 'totalAmount'], 'order');
  }

  async findAllAdmin(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<IOrder>> {
    const qb = this.createQueryBuilder('order')
      .leftJoinAndSelect('order.event', 'event')
      .leftJoinAndSelect('order.user', 'user');

    if (paginationDto.search) {
      qb.andWhere('(event.title ILIKE :search OR user.name ILIKE :search)', {
        search: `%${paginationDto.search}%`,
      });
    }

    return paginate(qb, paginationDto, ['createdAt', 'totalAmount'], 'order');
  }
}
