import { Role } from '../../../../../infrastructures/databases/entities/user.entity.js';
import { AuthResponse } from '../../../services/v1/auth.v1.service.js';

export class AuthUserDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;

  constructor(data: { id: string; name: string; email: string; role: string }) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.role = data.role as Role;
  }
}

export class AuthResponseDto {
  user!: AuthUserDto;
  accessToken!: string;

  constructor(data: AuthResponse) {
    this.user = new AuthUserDto(data.user);
    this.accessToken = data.accessToken;
  }

  static MapEntity(data: AuthResponse): AuthResponseDto {
    return new AuthResponseDto(data);
  }
}
