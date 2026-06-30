import { IBaseEntity } from './base-entity.interface.js';
import { Role } from '../entities/user.entity.js';

export interface IUser extends IBaseEntity {
  name: string;
  email: string;
  password?: string;
  role: Role;
}
