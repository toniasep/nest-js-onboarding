import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { Order } from '../orders/entities/order.entity.js';

/**
 * DashboardModule
 *
 * Module untuk fitur dashboard admin:
 * - Sales summary, top events, top categories, export laporan
 * - Menggunakan TypeORM Order repository untuk aggregate queries
 * - Redis caching (via global CacheModule) untuk heavy aggregation
 * - MinioService (global) untuk upload export file
 *
 * Referensi: rules.md §1 — Modular Architecture
 */
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
