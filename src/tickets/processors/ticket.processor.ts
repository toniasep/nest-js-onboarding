import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TicketsService } from '../tickets.service.js';

/**
 * TicketProcessor
 *
 * BullMQ Worker untuk memproses job generate tiket di background.
 * Trigger: setelah payment PAID via webhook → OrdersService enqueue job.
 *
 * Referensi: rules.md §6 — Queue/Worker Pattern (BullMQ)
 */
@Processor('tickets')
export class TicketProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketProcessor.name);

  constructor(private readonly ticketsService: TicketsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'generate-tickets') {
      const { orderId } = job.data as { orderId: string };

      try {
        await this.ticketsService.createTickets(orderId);
        this.logger.log(`Successfully generated tickets for order ${orderId}`);
      } catch (error) {
        this.logger.error(
          `Failed to generate tickets for order ${orderId}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error; // Re-throw untuk BullMQ retry mechanism
      }
    }
  }
}
