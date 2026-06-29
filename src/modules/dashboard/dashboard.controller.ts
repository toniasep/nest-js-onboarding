import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import {
  DateRangeDto,
  TopRankedDto,
  ExportQueryDto,
} from './dto/dashboard-query.dto.js';

/**
 * DashboardController
 *
 * Admin-only endpoints untuk melihat ringkasan penjualan,
 * top event, top category, dan export laporan.
 *
 * Semua endpoint di-proteksi oleh JWT + Role ADMIN.
 *
 * Referensi: rules.md §2 — RESTful API Standards
 * Referensi: rules.md §5 — JWT Auth + Guards
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /admin/dashboard/sales
   *
   * Total penjualan berdasarkan rentang tanggal.
   * Query: startDate, endDate
   * Return: total orders, total revenue, total tickets sold
   */
  @Get('sales')
  getSales(@Query() dto: DateRangeDto) {
    return this.dashboardService.getSalesSummary(dto);
  }

  /**
   * GET /admin/dashboard/top-events
   *
   * Top events berdasarkan total revenue.
   * Query: startDate, endDate, limit (default: 10)
   * Return: ranked list of events by total amount penjualan
   */
  @Get('top-events')
  getTopEvents(@Query() dto: TopRankedDto) {
    return this.dashboardService.getTopEvents(dto);
  }

  /**
   * GET /admin/dashboard/top-categories
   *
   * Top categories berdasarkan total revenue.
   * Query: startDate, endDate, limit (default: 10)
   * Return: ranked list of categories by total amount penjualan
   */
  @Get('top-categories')
  getTopCategories(@Query() dto: TopRankedDto) {
    return this.dashboardService.getTopCategories(dto);
  }

  /**
   * GET /admin/dashboard/export
   *
   * Export data penjualan ke file Excel (.xlsx).
   * File di-upload ke Minio, return presigned download URL.
   * Query: startDate, endDate
   */
  @Get('export')
  exportReport(@Query() dto: ExportQueryDto) {
    return this.dashboardService.exportReport(dto);
  }
}
