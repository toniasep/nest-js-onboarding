import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './controllers/v1/dashboard.v1.controller.js';
import { DashboardService } from './services/v1/dashboard.v1.service.js';
import { Order } from '../../infrastructures/databases/entities/order.entity.js';
import { OrderAnalyticsRepository } from './repositories/v1/order-analytics.v1.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [DashboardController],
  providers: [DashboardService, OrderAnalyticsRepository],
})
export class DashboardModule {}
