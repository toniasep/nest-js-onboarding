import { IEventCategory } from '../../../../../infrastructures/databases/interfaces/event-category.interface.js';

export class EventCategoryResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(entity: IEventCategory) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static MapEntity(entity: IEventCategory): EventCategoryResponseDto {
    return new EventCategoryResponseDto(entity);
  }

  static MapEntities(entities: IEventCategory[]): EventCategoryResponseDto[] {
    return entities.map((item) => new EventCategoryResponseDto(item));
  }
}
