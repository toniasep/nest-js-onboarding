import { IBaseEntity } from './base-entity.interface.js';
import { IEvent } from './event.interface.js';

export interface IEventCategory extends IBaseEntity {
  name: string;
  description: string | null;
  events?: IEvent[];
}
