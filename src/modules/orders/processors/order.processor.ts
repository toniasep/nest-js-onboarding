import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from '../orders.service.js';
import { CreateXenditInvoiceDto } from '../dto/create-xendit-invoice.dto.js';
import { ExpireOrderDto } from '../dto/expire-order.dto.js';
import { QueueName } from '../../../common/enums/queue-name.enum.js';

@Processor(QueueName.ORDERS)
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly ordersService: OrdersService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'expire-order') {
      const dto = job.data as ExpireOrderDto;
      await this.ordersService.expireOrder(dto.orderId);
      this.logger.debug(`Processed expire-order for order ${dto.orderId}`);
    } else if (job.name === 'create-xendit-invoice') {
      const invoiceDto = job.data as CreateXenditInvoiceDto;
      await this.ordersService.processXenditInvoice(invoiceDto);
      this.logger.debug(
        `Processed create-xendit-invoice for order ${invoiceDto.orderId}`,
      );
    }
  }
}
