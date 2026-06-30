import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './controllers/v1/orders.v1.controller.js';
import { AdminOrdersController } from './controllers/v1/admin-orders.v1.controller.js';
import { PaymentsController } from './controllers/v1/payments.v1.controller.js';
import { OrdersService } from './services/v1/orders.v1.service.js';
import { Order } from '../../infrastructures/databases/entities/order.entity.js';
import { Event } from '../../infrastructures/databases/entities/event.entity.js';
import { OrderProcessor } from '../../infrastructures/modules/queue/processors/order.processor.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QueueName } from '../../shared/enums/queue-name.enum.js';
import { OrderRepository } from './repositories/v1/orders.v1.repository.js';
import { OrderEventRepository } from './repositories/v1/order-event.v1.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Event]),
    BullModule.registerQueue({ name: QueueName.ORDERS }),
    forwardRef(() => TicketsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [OrdersController, AdminOrdersController, PaymentsController],
  providers: [
    OrdersService,
    OrderProcessor,
    OrderRepository,
    OrderEventRepository,
  ],
})
export class OrdersModule {}
