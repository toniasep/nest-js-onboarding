export class SalesSummaryResponseDto {
  totalOrders!: number;
  totalRevenue!: number;
  totalTicketsSold!: number;
  startDate!: string;
  endDate!: string;

  constructor(partial: Partial<SalesSummaryResponseDto>) {
    Object.assign(this, partial);
  }
}
