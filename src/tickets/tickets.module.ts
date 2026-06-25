import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketProcessor } from './processors/ticket.processor.js';
import { Ticket } from './entities/ticket.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { Event } from '../events/entities/event.entity.js';

/**
 * TicketsModule
 *
 * Module untuk fitur ticketing: generate tiket, QR Code, PDF, dan verifikasi.
 * MinioService tersedia secara global dari MinioModule, tidak perlu import.
 *
 * Referensi: rules.md §1 — Modular Architecture
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Order, Event]),
    BullModule.registerQueue({
      name: 'tickets',
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketProcessor],
  exports: [TicketsService],
})
export class TicketsModule {}
