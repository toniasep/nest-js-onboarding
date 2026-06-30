import { IBaseEntity } from './base-entity.interface.js';
import { IEventCategory } from './event-category.interface.js';

export interface IEvent extends IBaseEntity {
  title: string;
  description: string;
  location: string;
  eventDate: Date;
  price: number;
  quota: number;
  isPublished: boolean;
  categoryId: string;
  category?: IEventCategory;
}
