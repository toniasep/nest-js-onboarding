import { EventCategoryResponseDto } from '../../../../event-categories/dtos/responses/v1/event-category-response.dto.js';

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

  constructor(partial: Partial<EventResponseDto>) {
    Object.assign(this, partial);
  }
}
