import { Role } from '../../../../../infrastructures/databases/entities/user.entity.js';
import { IUser } from '../../../../../infrastructures/databases/interfaces/user.interface.js';

export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(entity: IUser) {
    this.id = entity.id;
    this.name = entity.name;
    this.email = entity.email;
    this.role = entity.role;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static MapEntity(entity: IUser): UserResponseDto {
    return new UserResponseDto(entity);
  }

  static MapEntities(entities: IUser[]): UserResponseDto[] {
    return entities.map((item) => new UserResponseDto(item));
  }
}
