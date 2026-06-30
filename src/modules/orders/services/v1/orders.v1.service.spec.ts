import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.v1.service';
import { OrderRepository } from '../../repositories/v1/orders.v1.repository';
import { OrderEventRepository } from '../../repositories/v1/order-event.v1.repository';
import { XenditService } from '../../../../infrastructures/integrations/xendit/xendit.service';
import {
  Order,
  OrderStatus,
} from '../../../../infrastructures/databases/entities/order.entity';
import { TicketsService } from '../../../tickets/services/v1/tickets.v1.service';
import { NotificationsService } from '../../../notifications/services/v1/notifications.v1.service';
import { QueueName } from '../../../../shared/enums/queue-name.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Partial<OrderRepository>>;
  let orderEventRepository: jest.Mocked<Partial<OrderEventRepository>>;
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

  const paginationDto = {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'DESC' as any,
  };

  beforeEach(async () => {
    orderRepository = {
      findById: jest.fn(),
      findAllByUser: jest.fn(),
      findAllAdmin: jest.fn(),
      save: jest.fn(),
    };

    orderEventRepository = {
      findById: jest.fn(),
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
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderEventRepository, useValue: orderEventRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: getQueueToken(QueueName.ORDERS), useValue: mockQueue },
        {
          provide: XenditService,
          useValue: { client: { Invoice: { createInvoice: jest.fn() } } },
        },
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
    it('should return paginated orders for a user', async () => {
      const paginatedResult = {
        data: [mockOrder],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      (orderRepository.findAllByUser as jest.Mock).mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAllByUser('user-uuid-1', paginationDto);

      expect(result).toEqual(paginatedResult);
      expect(orderRepository.findAllByUser).toHaveBeenCalledWith(
        'user-uuid-1',
        paginationDto,
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an order when found', async () => {
      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOne('order-uuid-1');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findById).toHaveBeenCalledWith('order-uuid-1');
    });

    it('should throw NotFoundException when order not found', async () => {
      (orderRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAllAdmin ───────────────────────────────────────────

  describe('findAllAdmin', () => {
    it('should return paginated orders for admin', async () => {
      const paginatedResult = {
        data: [mockOrder],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      (orderRepository.findAllAdmin as jest.Mock).mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAllAdmin(paginationDto);

      expect(result).toEqual(paginatedResult);
      expect(orderRepository.findAllAdmin).toHaveBeenCalledWith(paginationDto);
    });
  });

  // ─── handleWebhook ──────────────────────────────────────────

  describe('handleWebhook', () => {
    it('should set order to PAID and trigger ticket generation when status is PAID', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      (orderRepository.findById as jest.Mock).mockResolvedValue(pendingOrder);
      (orderRepository.save as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });
      (ticketsService.generateTicketsForOrder as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.handleWebhook({
        external_id: 'order-uuid-1',
        status: 'PAID',
      });

      expect(orderRepository.save).toHaveBeenCalled();
      expect(ticketsService.generateTicketsForOrder).toHaveBeenCalledWith(
        'order-uuid-1',
      );
    });

    it('should set order to PAID when status is SETTLED', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      (orderRepository.findById as jest.Mock).mockResolvedValue(pendingOrder);
      (orderRepository.save as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });
      (ticketsService.generateTicketsForOrder as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.handleWebhook({
        external_id: 'order-uuid-1',
        status: 'SETTLED',
      });

      expect(orderRepository.save).toHaveBeenCalled();
      expect(ticketsService.generateTicketsForOrder).toHaveBeenCalledWith(
        'order-uuid-1',
      );
    });

    it('should ignore webhook if no external_id', async () => {
      await service.handleWebhook({ status: 'PAID' });

      expect(orderRepository.findById).not.toHaveBeenCalled();
    });

    it('should ignore webhook if order not found', async () => {
      (orderRepository.findById as jest.Mock).mockResolvedValue(null);

      await service.handleWebhook({
        external_id: 'nonexistent',
        status: 'PAID',
      });

      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });
});
