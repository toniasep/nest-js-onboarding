import { SalesSummary } from '../../../services/v1/dashboard.v1.service.js';

export class SalesSummaryResponseDto {
  totalOrders!: number;
  totalRevenue!: number;
  totalTicketsSold!: number;
  startDate!: string;
  endDate!: string;

  constructor(data: SalesSummary) {
    this.totalOrders = data.totalOrders;
    this.totalRevenue = data.totalRevenue;
    this.totalTicketsSold = data.totalTicketsSold;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
  }

  static MapEntity(data: SalesSummary): SalesSummaryResponseDto {
    return new SalesSummaryResponseDto(data);
  }
}
