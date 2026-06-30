import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
} from '../../../../infrastructures/databases/entities/ticket.entity.js';
import { ITicket } from '../../../../infrastructures/databases/interfaces/ticket.interface.js';

@Injectable()
export class ReminderTicketRepository extends Repository<ITicket> {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<ITicket>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findActiveTicketsByEventId(eventId: string): Promise<ITicket[]> {
    return this.find({
      where: { eventId, status: TicketStatus.ACTIVE },
      relations: { user: true },
    });
  }
}
