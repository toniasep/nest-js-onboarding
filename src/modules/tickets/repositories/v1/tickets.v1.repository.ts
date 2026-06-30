import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
} from '../../../../infrastructures/databases/entities/ticket.entity.js';
import { ITicket } from '../../../../infrastructures/databases/interfaces/ticket.interface.js';
import { SortOrder } from '../../../../shared/dtos/pagination.dto.js';

@Injectable()
export class TicketRepository extends Repository<ITicket> {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<ITicket>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async countByOrderId(orderId: string): Promise<number> {
    return this.count({ where: { orderId } });
  }

  async findAllByUser(userId: string): Promise<ITicket[]> {
    return this.find({
      where: { userId },
      relations: { event: true, order: true },
      order: { createdAt: SortOrder.DESC },
    });
  }

  async findById(id: string): Promise<ITicket | null> {
    return this.findOne({
      where: { id },
      relations: { event: true, order: true, user: true },
    });
  }

  async findByTicketCode(ticketCode: string): Promise<ITicket | null> {
    return this.findOne({
      where: { ticketCode },
      relations: { event: true, user: true },
    });
  }

  async markAsUsed(ticket: ITicket): Promise<ITicket> {
    ticket.status = TicketStatus.USED;
    return this.save(ticket);
  }
}
