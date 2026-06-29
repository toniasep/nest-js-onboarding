import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderAnalyticsRepository } from './repositories/order-analytics.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [DashboardController],
  providers: [DashboardService, OrderAnalyticsRepository],
})
export class DashboardModule {}
