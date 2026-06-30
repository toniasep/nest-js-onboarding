import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from '../../services/v1/dashboard.v1.service.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import {
  DateRangeDto,
  TopRankedDto,
  ExportQueryDto,
} from '../../dtos/requests/v1/dashboard-query.dto.js';
import { SalesSummaryResponseDto } from '../../dtos/responses/v1/sales-summary-response.dto.js';
import { RankedItemResponseDto } from '../../dtos/responses/v1/ranked-item-response.dto.js';
import { ExportResultResponseDto } from '../../dtos/responses/v1/export-result-response.dto.js';

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
  async getSales(@Query() dto: DateRangeDto): Promise<SalesSummaryResponseDto> {
    const data = await this.dashboardService.getSalesSummary(dto);
    return SalesSummaryResponseDto.MapEntity(data);
  }

  /**
   * GET /admin/dashboard/top-events
   *
   * Top events berdasarkan total revenue.
   * Query: startDate, endDate, limit (default: 10)
   * Return: ranked list of events by total amount penjualan
   */
  @Get('top-events')
  async getTopEvents(
    @Query() dto: TopRankedDto,
  ): Promise<RankedItemResponseDto[]> {
    const data = await this.dashboardService.getTopEvents(dto);
    return RankedItemResponseDto.MapEntities(data);
  }

  /**
   * GET /admin/dashboard/top-categories
   *
   * Top categories berdasarkan total revenue.
   * Query: startDate, endDate, limit (default: 10)
   * Return: ranked list of categories by total amount penjualan
   */
  @Get('top-categories')
  async getTopCategories(
    @Query() dto: TopRankedDto,
  ): Promise<RankedItemResponseDto[]> {
    const data = await this.dashboardService.getTopCategories(dto);
    return RankedItemResponseDto.MapEntities(data);
  }

  /**
   * GET /admin/dashboard/export
   *
   * Export data penjualan ke file Excel (.xlsx).
   * File di-upload ke Minio, return presigned download URL.
   * Query: startDate, endDate
   */
  @Get('export')
  async exportReport(
    @Query() dto: ExportQueryDto,
  ): Promise<ExportResultResponseDto> {
    const data = await this.dashboardService.exportReport(dto);
    return ExportResultResponseDto.MapEntity(data);
  }
}
