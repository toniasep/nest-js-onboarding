import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QueueName } from '../../common/enums/queue-name.enum.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketProcessor } from './processors/ticket.processor.js';
import { Ticket } from './entities/ticket.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { TicketRepository } from './repositories/ticket.repository.js';
import { TicketOrderRepository } from './repositories/ticket-order.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Order]),
    BullModule.registerQueue({ name: QueueName.TICKETS }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketProcessor,
    TicketRepository,
    TicketOrderRepository,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
