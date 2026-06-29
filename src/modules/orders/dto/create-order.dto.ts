import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  eventId!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;
}
