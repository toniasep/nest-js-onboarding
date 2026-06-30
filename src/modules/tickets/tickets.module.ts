import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QueueName } from '../../shared/enums/queue-name.enum.js';
import { TicketsController } from './controllers/v1/tickets.v1.controller.js';
import { TicketsService } from './services/v1/tickets.v1.service.js';
import { TicketProcessor } from '../../infrastructures/modules/queue/processors/ticket.processor.js';
import { Ticket } from '../../infrastructures/databases/entities/ticket.entity.js';
import { Order } from '../../infrastructures/databases/entities/order.entity.js';
import { TicketRepository } from './repositories/v1/tickets.v1.repository.js';
import { TicketOrderRepository } from './repositories/v1/ticket-order.v1.repository.js';

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
