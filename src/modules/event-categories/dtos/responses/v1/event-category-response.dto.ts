export class EventCategoryResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<EventCategoryResponseDto>) {
    Object.assign(this, partial);
  }
}
