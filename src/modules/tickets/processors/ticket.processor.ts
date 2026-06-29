import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TicketsService } from '../tickets.service.js';
import { GenerateTicketDto } from '../dto/generate-ticket.dto.js';

/**
 * TicketProcessor
 *
 * BullMQ Worker untuk memproses job generate tiket di background.
 * Trigger: setelah payment PAID via webhook → OrdersService enqueue job.
 *
 * Referensi: rules.md §6 — Queue/Worker Pattern (BullMQ)
 */
import { QueueName } from '../../../common/enums/queue-name.enum.js';

@Processor(QueueName.TICKETS)
export class TicketProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketProcessor.name);

  constructor(private readonly ticketsService: TicketsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'generate-tickets') {
      const dto = job.data as GenerateTicketDto;

      try {
        await this.ticketsService.createTickets(dto.orderId);
        this.logger.debug(
          `Processed generate-tickets for order ${dto.orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate tickets for order ${dto.orderId}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error; // Re-throw untuk BullMQ retry mechanism
      }
    }
  }
}
