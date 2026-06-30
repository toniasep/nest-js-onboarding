import { RankedItem } from '../../../services/v1/dashboard.v1.service.js';

export class RankedItemResponseDto {
  rank!: number;
  id!: string;
  name!: string;
  totalRevenue!: number;
  totalOrders!: number;

  constructor(data: RankedItem) {
    this.rank = data.rank;
    this.id = data.id;
    this.name = data.name;
    this.totalRevenue = data.totalRevenue;
    this.totalOrders = data.totalOrders;
  }

  static MapEntity(data: RankedItem): RankedItemResponseDto {
    return new RankedItemResponseDto(data);
  }

  static MapEntities(dataList: RankedItem[]): RankedItemResponseDto[] {
    return dataList.map((item) => new RankedItemResponseDto(item));
  }
}
