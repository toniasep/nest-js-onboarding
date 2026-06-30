import { OrderProcessor } from './order.processor';
import { OrdersService } from '../../../../modules/orders/services/v1/orders.v1.service';

describe('OrderProcessor', () => {
  let processor: OrderProcessor;
  let ordersService: jest.Mocked<Partial<OrdersService>>;

  beforeEach(() => {
    ordersService = {
      expireOrder: jest.fn(),
    };

    processor = new OrderProcessor(ordersService as OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should call expireOrder for expire-order job', async () => {
      const job = {
        id: 'job-1',
        name: 'expire-order',
        data: { orderId: 'order-uuid-1' },
      };

      await processor.process(job as any);

      expect(ordersService.expireOrder).toHaveBeenCalledWith('order-uuid-1');
    });

    it('should not call expireOrder for other job types', async () => {
      const job = {
        id: 'job-2',
        name: 'unknown-job',
        data: {},
      };

      await processor.process(job as any);

      expect(ordersService.expireOrder).not.toHaveBeenCalled();
    });
  });
});
