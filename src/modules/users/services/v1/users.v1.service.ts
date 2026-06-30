import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { IUser } from '../../../../infrastructures/databases/interfaces/user.interface.js';
import { UserRepository } from '../../repositories/v1/users.v1.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async updateRole(id: string, role: Role): Promise<IUser> {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepository.save(user);
  }
}
