import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import ExcelJS from 'exceljs';

import { Order } from '../../../../infrastructures/databases/entities/order.entity.js';
import { MinioService } from '../../../../infrastructures/modules/storage/minio.service.js';
import { REPORTS_BUCKET } from '../../dashboard.constants.js';
import {
  DateRangeDto,
  TopRankedDto,
  ExportQueryDto,
} from '../../dtos/requests/v1/dashboard-query.dto.js';
import { OrderAnalyticsRepository } from '../../repositories/v1/order-analytics.v1.repository.js';

export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  totalTicketsSold: number;
  startDate: string;
  endDate: string;
}

export interface RankedItem {
  rank: number;
  id: string;
  name: string;
  totalRevenue: number;
  totalOrders: number;
}

export interface ExportResult {
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
}

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly orderAnalyticsRepository: OrderAnalyticsRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly minioService: MinioService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.minioService.ensureBucketExists(REPORTS_BUCKET);
  }

  async getSalesSummary(dto: DateRangeDto): Promise<SalesSummary> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:sales:${dto.startDate}:${dto.endDate}`;
    const cached = await this.cacheManager.get<SalesSummary>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);
    const result = await this.orderAnalyticsRepository.getSalesSummary(
      startDate,
      endDate,
    );

    const summary: SalesSummary = {
      totalOrders: parseInt(result.totalOrders, 10),
      totalRevenue: parseFloat(result.totalRevenue),
      totalTicketsSold: parseInt(result.totalTicketsSold, 10),
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    await this.cacheManager.set(cacheKey, summary, DASHBOARD_CACHE_TTL);
    this.logger.debug(`Cache set: ${cacheKey}`);
    return summary;
  }

  async getTopEvents(dto: TopRankedDto): Promise<RankedItem[]> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:top-events:${dto.startDate}:${dto.endDate}:${dto.limit}`;
    const cached = await this.cacheManager.get<RankedItem[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);
    const results = await this.orderAnalyticsRepository.getTopEvents(
      startDate,
      endDate,
      dto.limit,
    );

    const ranked: RankedItem[] = results.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      totalRevenue: parseFloat(row.totalRevenue),
      totalOrders: parseInt(row.totalOrders, 10),
    }));

    await this.cacheManager.set(cacheKey, ranked, DASHBOARD_CACHE_TTL);
    this.logger.debug(`Cache set: ${cacheKey}`);
    return ranked;
  }

  async getTopCategories(dto: TopRankedDto): Promise<RankedItem[]> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:top-categories:${dto.startDate}:${dto.endDate}:${dto.limit}`;
    const cached = await this.cacheManager.get<RankedItem[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);
    const results = await this.orderAnalyticsRepository.getTopCategories(
      startDate,
      endDate,
      dto.limit,
    );

    const ranked: RankedItem[] = results.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      totalRevenue: parseFloat(row.totalRevenue),
      totalOrders: parseInt(row.totalOrders, 10),
    }));

    await this.cacheManager.set(cacheKey, ranked, DASHBOARD_CACHE_TTL);
    this.logger.debug(`Cache set: ${cacheKey}`);
    return ranked;
  }

  async exportReport(dto: ExportQueryDto): Promise<ExportResult> {
    this.validateDateRange(dto);
    const { startDate, endDate } = this.parseDateRange(dto);

    const orders = await this.orderAnalyticsRepository.findPaidOrdersBetween(
      startDate,
      endDate,
    );
    const buffer = await this.buildExcelReport(orders, dto);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `sales-report_${dto.startDate}_${dto.endDate}_${timestamp}.xlsx`;
    const objectName = `exports/${fileName}`;

    await this.minioService.uploadFile(
      REPORTS_BUCKET,
      objectName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const downloadUrl = await this.minioService.getFileUrl(
      REPORTS_BUCKET,
      objectName,
    );
    this.logger.log(`Report exported: ${objectName}`);

    return { downloadUrl, fileName, generatedAt: new Date().toISOString() };
  }

  private validateDateRange(dto: DateRangeDto): void {
    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
  }

  private parseDateRange(dto: DateRangeDto): {
    startDate: Date;
    endDate: Date;
  } {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  private async buildExcelReport(
    orders: Order[],
    dto: ExportQueryDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nest Ticketing Admin';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Sales Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 },
    ];

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const totalTickets = orders.reduce((sum, o) => sum + o.quantity, 0);

    summarySheet.addRow({
      metric: 'Report Period',
      value: `${dto.startDate} - ${dto.endDate}`,
    });
    summarySheet.addRow({
      metric: 'Total Orders (PAID)',
      value: orders.length,
    });
    summarySheet.addRow({ metric: 'Total Revenue', value: totalRevenue });
    summarySheet.addRow({ metric: 'Total Tickets Sold', value: totalTickets });
    summarySheet.addRow({
      metric: 'Generated At',
      value: new Date().toISOString(),
    });

    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    const detailSheet = workbook.addWorksheet('Orders Detail');
    detailSheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 40 },
      { header: 'Order Date', key: 'orderDate', width: 25 },
      { header: 'Event', key: 'event', width: 35 },
      { header: 'Buyer', key: 'buyer', width: 25 },
      { header: 'Buyer Email', key: 'buyerEmail', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    for (const order of orders) {
      detailSheet.addRow({
        orderId: order.id,
        orderDate: order.createdAt.toISOString(),
        event: order.event?.title ?? 'N/A',
        buyer: order.user?.name ?? 'N/A',
        buyerEmail: order.user?.email ?? 'N/A',
        quantity: order.quantity,
        totalAmount: Number(order.totalAmount),
        status: order.status,
      });
    }

    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
