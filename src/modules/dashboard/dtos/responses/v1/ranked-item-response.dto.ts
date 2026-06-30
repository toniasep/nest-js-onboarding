export class RankedItemResponseDto {
  rank!: number;
  id!: string;
  name!: string;
  totalRevenue!: number;
  totalOrders!: number;

  constructor(partial: Partial<RankedItemResponseDto>) {
    Object.assign(this, partial);
  }
}
