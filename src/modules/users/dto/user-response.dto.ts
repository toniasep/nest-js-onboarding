import { Role } from '../entities/user.entity.js';

export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
