import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from '../orders.service.js';

@Processor('orders')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly ordersService: OrdersService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'expire-order') {
      const { orderId } = job.data as { orderId: string };
      await this.ordersService.expireOrder(orderId);
      this.logger.debug(`Processed expire-order for order ${orderId}`);
    }
  }
}
