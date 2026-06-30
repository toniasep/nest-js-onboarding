import { Role } from '../../../../../infrastructures/databases/entities/user.entity.js';

export class AuthUserDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;

  constructor(partial: Partial<AuthUserDto>) {
    Object.assign(this, partial);
  }
}

export class AuthResponseDto {
  user!: AuthUserDto;
  accessToken!: string;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
