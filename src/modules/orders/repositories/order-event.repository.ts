import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Event } from '../../events/entities/event.entity.js';

@Injectable()
export class OrderEventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repo: Repository<Event>,
  ) {}

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<Event | null> {
    return manager.getRepository(Event).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findById(id: string): Promise<Event | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(event: Event, manager: EntityManager): Promise<Event> {
    return manager.getRepository(Event).save(event);
  }
}
