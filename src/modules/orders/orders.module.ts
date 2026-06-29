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
import { QueueName } from '../../common/enums/queue-name.enum.js';
import { OrderRepository } from './repositories/order.repository.js';
import { OrderEventRepository } from './repositories/order-event.repository.js';

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
