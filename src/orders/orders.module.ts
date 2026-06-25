import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { PaymentsController } from './payments.controller.js';
import { OrdersService } from './orders.service.js';
import { Order } from './entities/order.entity.js';
import { Event } from '../events/entities/event.entity.js';
import { OrderProcessor } from './processors/order.processor.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Event]),
    BullModule.registerQueue({
      name: 'orders',
    }),
    forwardRef(() => TicketsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [OrdersController, AdminOrdersController, PaymentsController],
  providers: [OrdersService, OrderProcessor],
})
export class OrdersModule {}
