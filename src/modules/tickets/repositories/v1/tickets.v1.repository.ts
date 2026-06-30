import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
} from '../../../../infrastructures/databases/entities/ticket.entity.js';
import { SortOrder } from '../../../../shared/dtos/pagination.dto.js';

@Injectable()
export class TicketRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
  ) {}

  create(data: Partial<Ticket>): Ticket {
    return this.repo.create(data);
  }

  async save(ticket: Ticket): Promise<Ticket> {
    return this.repo.save(ticket);
  }

  async countByOrderId(orderId: string): Promise<number> {
    return this.repo.count({ where: { orderId } });
  }

  async findAllByUser(userId: string): Promise<Ticket[]> {
    return this.repo.find({
      where: { userId },
      relations: { event: true, order: true },
      order: { createdAt: SortOrder.DESC },
    });
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.repo.findOne({
      where: { id },
      relations: { event: true, order: true, user: true },
    });
  }

  async findByTicketCode(ticketCode: string): Promise<Ticket | null> {
    return this.repo.findOne({
      where: { ticketCode },
      relations: { event: true, user: true },
    });
  }

  async markAsUsed(ticket: Ticket): Promise<Ticket> {
    ticket.status = TicketStatus.USED;
    return this.repo.save(ticket);
  }
}
