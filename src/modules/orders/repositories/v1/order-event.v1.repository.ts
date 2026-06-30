import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Event } from '../../../../infrastructures/databases/entities/event.entity.js';
import { IEvent } from '../../../../infrastructures/databases/interfaces/event.interface.js';

@Injectable()
export class OrderEventRepository extends Repository<IEvent> {
  constructor(
    @InjectRepository(Event)
    private readonly repo: Repository<IEvent>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<IEvent | null> {
    return manager.getRepository(Event).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findById(id: string): Promise<IEvent | null> {
    return this.findOne({ where: { id } });
  }
}
