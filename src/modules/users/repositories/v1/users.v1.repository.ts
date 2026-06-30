import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../infrastructures/databases/entities/user.entity.js';
import { IUser } from '../../../../infrastructures/databases/interfaces/user.interface.js';

@Injectable()
export class UserRepository extends Repository<IUser> {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<IUser>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<IUser | null> {
    return this.findOne({ where: { id } });
  }
}
