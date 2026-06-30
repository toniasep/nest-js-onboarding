import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrdersController } from './admin-orders.v1.controller';
import { OrdersService } from '../../services/v1/orders.v1.service';

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;
  let ordersService: jest.Mocked<Partial<OrdersService>>;

  const mockOrders = [
    {
      id: 'order-uuid-1',
      userId: 'user-uuid-1',
      eventId: 'event-uuid-1',
      quantity: 2,
      totalAmount: 200000,
      status: 'PAID',
    },
  ];

  beforeEach(async () => {
    ordersService = {
      findAllAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all orders (admin)', async () => {
      ordersService.findAllAdmin!.mockResolvedValue(mockOrders as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockOrders);
      expect(ordersService.findAllAdmin).toHaveBeenCalled();
    });
  });
});
