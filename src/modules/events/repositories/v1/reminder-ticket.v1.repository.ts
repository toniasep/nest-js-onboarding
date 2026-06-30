import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
} from '../../../../infrastructures/databases/entities/ticket.entity.js';

@Injectable()
export class ReminderTicketRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
  ) {}

  async findActiveTicketsByEventId(eventId: string): Promise<Ticket[]> {
    return this.repo.find({
      where: { eventId, status: TicketStatus.ACTIVE },
      relations: { user: true },
    });
  }
}
