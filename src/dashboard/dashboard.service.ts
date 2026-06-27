import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import ExcelJS from 'exceljs';

import { Order, OrderStatus } from '../orders/entities/order.entity.js';
import { MinioService } from '../minio/minio.service.js';
import { REPORTS_BUCKET } from './dashboard.constants.js';
import {
  DateRangeDto,
  TopRankedDto,
  ExportQueryDto,
} from './dto/dashboard-query.dto.js';

/**
 * Interface untuk hasil Total Penjualan
 */
export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  totalTicketsSold: number;
  startDate: string;
  endDate: string;
}

/**
 * Interface untuk hasil Top Events / Top Categories
 */
export interface RankedItem {
  rank: number;
  id: string;
  name: string;
  totalRevenue: number;
  totalOrders: number;
}

/**
 * Interface untuk hasil Export Laporan
 */
export interface ExportResult {
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
}

// ─── Interfaces untuk Hasil Query Raw ─────────────────────

interface RawSalesSummary {
  totalOrders: string;
  totalRevenue: string;
  totalTicketsSold: string;
}

interface RawRankedItem {
  id: string;
  name: string;
  totalRevenue: string;
  totalOrders: string;
}

/** TTL cache dashboard (dalam ms) — 5 menit */
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

/**
 * DashboardService
 *
 * Business logic untuk dashboard admin:
 * - Total penjualan by date range
 * - Top events by revenue
 * - Top categories by revenue
 * - Export laporan ke Excel (upload Minio)
 *
 * Menggunakan Redis caching untuk heavy aggregation queries.
 *
 * Referensi: prd.md §3.6 — Redis Caching
 * Referensi: rules.md §3 — Repository Pattern (aggregate queries)
 * Referensi: rules.md §4 — Clean Code, Extract Method
 */
@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly minioService: MinioService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.minioService.ensureBucketExists(REPORTS_BUCKET);
  }

  // ─── Total Penjualan by Date Range ────────────────────────

  /**
   * Menghitung total penjualan dalam rentang tanggal tertentu.
   *
   * Hanya menghitung order dengan status PAID.
   * Hasil di-cache di Redis selama 5 menit.
   *
   * @returns Total orders, total revenue, total tickets sold
   */
  async getSalesSummary(dto: DateRangeDto): Promise<SalesSummary> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:sales:${dto.startDate}:${dto.endDate}`;
    const cached = await this.cacheManager.get<SalesSummary>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);

    const result = (await this.ordersRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(order.quantity), 0)', 'totalTicketsSold')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne()) as RawSalesSummary;

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

  // ─── Top Events by Revenue ────────────────────────────────

  /**
   * Menghitung ranking event berdasarkan total revenue (order PAID).
   *
   * @returns Ranked list of events by total amount penjualan
   */
  async getTopEvents(dto: TopRankedDto): Promise<RankedItem[]> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:top-events:${dto.startDate}:${dto.endDate}:${dto.limit}`;
    const cached = await this.cacheManager.get<RankedItem[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);

    const results = await this.ordersRepository
      .createQueryBuilder('order')
      .innerJoin('order.event', 'event')
      .select('event.id', 'id')
      .addSelect('event.title', 'name')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('event.id')
      .addGroupBy('event.title')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(dto.limit)
      .getRawMany();

    const ranked: RankedItem[] = results.map(
      (row: RawRankedItem, index: number) => ({
        rank: index + 1,
        id: row.id,
        name: row.name,
        totalRevenue: parseFloat(row.totalRevenue),
        totalOrders: parseInt(row.totalOrders, 10),
      }),
    );

    await this.cacheManager.set(cacheKey, ranked, DASHBOARD_CACHE_TTL);
    this.logger.debug(`Cache set: ${cacheKey}`);

    return ranked;
  }

  // ─── Top Event Categories by Revenue ──────────────────────

  /**
   * Menghitung ranking kategori event berdasarkan total revenue (order PAID).
   *
   * @returns Ranked list of categories by total amount penjualan
   */
  async getTopCategories(dto: TopRankedDto): Promise<RankedItem[]> {
    this.validateDateRange(dto);

    const cacheKey = `dashboard:top-categories:${dto.startDate}:${dto.endDate}:${dto.limit}`;
    const cached = await this.cacheManager.get<RankedItem[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const { startDate, endDate } = this.parseDateRange(dto);

    const results = await this.ordersRepository
      .createQueryBuilder('order')
      .innerJoin('order.event', 'event')
      .innerJoin('event.category', 'category')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(dto.limit)
      .getRawMany();

    const ranked: RankedItem[] = results.map(
      (row: RawRankedItem, index: number) => ({
        rank: index + 1,
        id: row.id,
        name: row.name,
        totalRevenue: parseFloat(row.totalRevenue),
        totalOrders: parseInt(row.totalOrders, 10),
      }),
    );

    await this.cacheManager.set(cacheKey, ranked, DASHBOARD_CACHE_TTL);
    this.logger.debug(`Cache set: ${cacheKey}`);

    return ranked;
  }

  // ─── Export Laporan ───────────────────────────────────────

  /**
   * Export data penjualan ke format Excel (.xlsx).
   *
   * Flow:
   * 1. Query semua order PAID dalam rentang tanggal
   * 2. Build Excel workbook (sheet: Sales Summary, Orders Detail)
   * 3. Upload ke Minio bucket 'reports'
   * 4. Return presigned download URL
   */
  async exportReport(dto: ExportQueryDto): Promise<ExportResult> {
    this.validateDateRange(dto);

    const { startDate, endDate } = this.parseDateRange(dto);

    // 1. Fetch semua order PAID dalam rentang tanggal
    const orders = await this.ordersRepository.find({
      where: {
        status: OrderStatus.PAID,
        createdAt: Between(startDate, endDate),
      },
      relations: { event: true, user: true },
      order: { createdAt: 'ASC' },
    });

    // 2. Build Excel workbook
    const buffer = await this.buildExcelReport(orders, dto);

    // 3. Upload ke Minio
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `sales-report_${dto.startDate}_${dto.endDate}_${timestamp}.xlsx`;
    const objectName = `exports/${fileName}`;

    await this.minioService.uploadFile(
      REPORTS_BUCKET,
      objectName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // 4. Get presigned download URL (1 jam)
    const downloadUrl = await this.minioService.getFileUrl(
      REPORTS_BUCKET,
      objectName,
    );

    this.logger.log(`Report exported: ${objectName}`);

    return {
      downloadUrl,
      fileName,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private Helper Methods ───────────────────────────────

  /**
   * Validasi bahwa startDate tidak lebih besar dari endDate.
   */
  private validateDateRange(dto: DateRangeDto): void {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
  }

  /**
   * Parse date string ke Date objects.
   * endDate di-set ke akhir hari (23:59:59.999).
   */
  private parseDateRange(dto: DateRangeDto): {
    startDate: Date;
    endDate: Date;
  } {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    // Set endDate ke akhir hari agar inklusif
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Build Excel workbook dengan 2 sheet:
   * 1. Sales Summary — ringkasan total
   * 2. Orders Detail — detail per order
   */
  private async buildExcelReport(
    orders: Order[],
    dto: ExportQueryDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nest Ticketing Admin';
    workbook.created = new Date();

    // ─── Sheet 1: Sales Summary ──────────────────────────
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
    summarySheet.addRow({
      metric: 'Total Revenue',
      value: totalRevenue,
    });
    summarySheet.addRow({
      metric: 'Total Tickets Sold',
      value: totalTickets,
    });
    summarySheet.addRow({
      metric: 'Generated At',
      value: new Date().toISOString(),
    });

    // Style header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ─── Sheet 2: Orders Detail ──────────────────────────
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

    // Style header row
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Write to buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
