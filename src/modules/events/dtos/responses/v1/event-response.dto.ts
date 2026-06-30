import { EventCategoryResponseDto } from '../../../../event-categories/dtos/responses/v1/event-category-response.dto.js';
import { IEvent } from '../../../../../infrastructures/databases/interfaces/event.interface.js';

export class EventResponseDto {
  id!: string;
  title!: string;
  description!: string;
  location!: string;
  eventDate!: Date;
  price!: number;
  quota!: number;
  isPublished!: boolean;
  categoryId!: string;
  category?: EventCategoryResponseDto;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(entity: IEvent) {
    this.id = entity.id;
    this.title = entity.title;
    this.description = entity.description;
    this.location = entity.location;
    this.eventDate = entity.eventDate;
    this.price = entity.price;
    this.quota = entity.quota;
    this.isPublished = entity.isPublished;
    this.categoryId = entity.categoryId;

    if (entity.category) {
      this.category = EventCategoryResponseDto.MapEntity(entity.category);
    }

    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static MapEntity(entity: IEvent): EventResponseDto {
    return new EventResponseDto(entity);
  }

  static MapEntities(entities: IEvent[]): EventResponseDto[] {
    return entities.map((item) => new EventResponseDto(item));
  }
}
