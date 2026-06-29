import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { TicketsService } from '../tickets/tickets.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Partial<Repository<Order>>>;
  let mockQueue: { add: jest.Mock };
  let ticketsService: jest.Mocked<Partial<TicketsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;

  const mockOrder: Order = {
    id: 'order-uuid-1',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    quantity: 2,
    totalAmount: 200000,
    status: OrderStatus.PENDING,
    paymentUrl: 'https://checkout.xendit.co/xxx',
    xenditInvoiceId: 'xendit-inv-1',
    user: {
      id: 'user-uuid-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed',
      role: 'USER' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    event: {
      id: 'event-uuid-1',
      title: 'Concert',
      description: 'A concert',
      location: 'Jakarta',
      eventDate: new Date(),
      price: 100000,
      quota: 100,
      isPublished: true,
      categoryId: 'cat-uuid-1',
      category: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    ordersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockQueue = { add: jest.fn() };

    ticketsService = {
      generateTicketsForOrder: jest.fn(),
    };

    notificationsService = {
      enqueuePaymentNotification: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: getQueueToken('orders'), useValue: mockQueue },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-xendit-key') },
        },
        { provide: TicketsService, useValue: ticketsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findAllByUser ──────────────────────────────────────────

  describe('findAllByUser', () => {
    it('should return all orders for a user', async () => {
      const orders = [mockOrder];
      ordersRepository.find!.mockResolvedValue(orders);

      const result = await service.findAllByUser('user-uuid-1');

      expect(result).toEqual(orders);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: { event: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an order when found', async () => {
      ordersRepository.findOne!.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-uuid-1');

      expect(result).toEqual(mockOrder);
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-uuid-1' },
        relations: { event: true, user: true },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAllAdmin ───────────────────────────────────────────

  describe('findAllAdmin', () => {
    it('should return all orders', async () => {
      const orders = [mockOrder];
      ordersRepository.find!.mockResolvedValue(orders);

      const result = await service.findAllAdmin();

      expect(result).toEqual(orders);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        relations: { event: true, user: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ─── handleWebhook ──────────────────────────────────────────

  describe('handleWebhook', () => {
    it('should set order to PAID and trigger ticket generation when status is PAID', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      ordersRepository.findOne!.mockResolvedValue(pendingOrder);
      ordersRepository.save!.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });

      await service.handleWebhook({
        external_id: 'order-uuid-1',
        status: 'PAID',
      });

      expect(ordersRepository.save).toHaveBeenCalled();
      expect(ticketsService.generateTicketsForOrder).toHaveBeenCalledWith(
        'order-uuid-1',
      );
    });

    it('should set order to PAID when status is SETTLED', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      ordersRepository.findOne!.mockResolvedValue(pendingOrder);
      ordersRepository.save!.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });

      await service.handleWebhook({
        external_id: 'order-uuid-1',
        status: 'SETTLED',
      });

      expect(ordersRepository.save).toHaveBeenCalled();
      expect(ticketsService.generateTicketsForOrder).toHaveBeenCalledWith(
        'order-uuid-1',
      );
    });

    it('should ignore webhook if no external_id', async () => {
      await service.handleWebhook({ status: 'PAID' });

      expect(ordersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should ignore webhook if order not found', async () => {
      ordersRepository.findOne!.mockResolvedValue(null);

      await service.handleWebhook({
        external_id: 'nonexistent',
        status: 'PAID',
      });

      expect(ordersRepository.save).not.toHaveBeenCalled();
    });
  });
});
