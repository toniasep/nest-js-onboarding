import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.v1.controller';
import { OrdersService } from '../../services/v1/orders.v1.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<Partial<OrdersService>>;

  const mockOrder = {
    id: 'order-uuid-1',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    quantity: 2,
    totalAmount: 200000,
    status: 'PENDING',
  };

  beforeEach(async () => {
    ordersService = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order with userId and email from request', async () => {
      const req = { user: { id: 'user-uuid-1', email: 'test@example.com' } };
      const createDto = { eventId: 'event-uuid-1', quantity: 2 };
      ordersService.create!.mockResolvedValue(mockOrder as any);

      const result = await controller.create(req, createDto);

      expect(result).toEqual(mockOrder);
      expect(ordersService.create).toHaveBeenCalledWith(
        'user-uuid-1',
        createDto,
        'test@example.com',
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders for the current user', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const paginationDto = { page: 1, limit: 10 } as any;
      ordersService.findAllByUser!.mockResolvedValue([mockOrder] as any);

      const result = await controller.findAll(req, paginationDto);

      expect(result).toEqual([mockOrder]);
      expect(ordersService.findAllByUser).toHaveBeenCalledWith(
        'user-uuid-1',
        paginationDto,
      );
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      ordersService.findOne!.mockResolvedValue(mockOrder as any);

      const result = await controller.findOne('order-uuid-1');

      expect(result).toEqual(mockOrder);
      expect(ordersService.findOne).toHaveBeenCalledWith('order-uuid-1');
    });
  });
});
