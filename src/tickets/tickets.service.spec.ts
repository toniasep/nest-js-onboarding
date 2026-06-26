import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepository: jest.Mocked<Partial<Repository<Ticket>>>;
  let ordersRepository: jest.Mocked<Partial<Repository<Order>>>;
  let mockQueue: { add: jest.Mock };
  let minioService: jest.Mocked<Partial<MinioService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  const mockTicket: Ticket = {
    id: 'ticket-uuid-1',
    orderId: 'order-uuid-1',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    ticketCode: 'ticket-code-uuid',
    qrCodeUrl: 'qr/ticket-code-uuid.png',
    pdfUrl: 'pdf/ticket-code-uuid.pdf',
    status: TicketStatus.ACTIVE,
    order: {} as Order,
    user: { id: 'user-uuid-1', name: 'Test', email: 'test@example.com' } as any,
    event: {
      title: 'Concert',
      eventDate: new Date(),
      location: 'Jakarta',
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    ticketsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    ordersRepository = {
      findOne: jest.fn(),
    };

    mockQueue = { add: jest.fn() };

    minioService = {
      uploadFile: jest.fn(),
      getFileStream: jest.fn(),
    };

    notificationsService = {
      enqueueTicketEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: ticketsRepository },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        { provide: getQueueToken('tickets'), useValue: mockQueue },
        { provide: MinioService, useValue: minioService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── generateTicketsForOrder ────────────────────────────────

  describe('generateTicketsForOrder', () => {
    it('should enqueue a ticket generation job', async () => {
      await service.generateTicketsForOrder('order-uuid-1');

      expect(mockQueue.add).toHaveBeenCalledWith('generate-tickets', {
        orderId: 'order-uuid-1',
      });
    });
  });

  // ─── findAllByUser ──────────────────────────────────────────

  describe('findAllByUser', () => {
    it('should return all tickets for a user', async () => {
      ticketsRepository.find!.mockResolvedValue([mockTicket]);

      const result = await service.findAllByUser('user-uuid-1');

      expect(result).toEqual([mockTicket]);
      expect(ticketsRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: { event: true, order: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a ticket when found', async () => {
      ticketsRepository.findOne!.mockResolvedValue(mockTicket);

      const result = await service.findOne('ticket-uuid-1');

      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      ticketsRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      ticketsRepository.findOne!.mockResolvedValue(mockTicket);

      await expect(
        service.findOne('ticket-uuid-1', 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return ticket when userId matches', async () => {
      ticketsRepository.findOne!.mockResolvedValue(mockTicket);

      const result = await service.findOne('ticket-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockTicket);
    });
  });

  // ─── downloadTicketPdf ──────────────────────────────────────

  describe('downloadTicketPdf', () => {
    it('should return stream and ticketCode for valid ticket', async () => {
      const mockStream = { pipe: jest.fn() } as any;
      ticketsRepository.findOne!.mockResolvedValue(mockTicket);
      minioService.getFileStream!.mockResolvedValue(mockStream);

      const result = await service.downloadTicketPdf('ticket-uuid-1');

      expect(result.stream).toEqual(mockStream);
      expect(result.ticketCode).toEqual(mockTicket.ticketCode);
    });

    it('should throw BadRequestException when PDF not yet generated', async () => {
      const ticketNoPdf = { ...mockTicket, pdfUrl: null };
      ticketsRepository.findOne!.mockResolvedValue(ticketNoPdf);

      await expect(service.downloadTicketPdf('ticket-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── verifyTicket ───────────────────────────────────────────

  describe('verifyTicket', () => {
    it('should verify an active ticket and mark as USED', async () => {
      const activeTicket = { ...mockTicket, status: TicketStatus.ACTIVE };
      ticketsRepository.findOne!.mockResolvedValue(activeTicket);
      ticketsRepository.save!.mockResolvedValue({
        ...activeTicket,
        status: TicketStatus.USED,
      });

      const result = await service.verifyTicket('ticket-code-uuid');

      expect(ticketsRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(TicketStatus.USED);
    });

    it('should throw NotFoundException when ticket code not found', async () => {
      ticketsRepository.findOne!.mockResolvedValue(null);

      await expect(service.verifyTicket('invalid-code')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when ticket already USED', async () => {
      const usedTicket = { ...mockTicket, status: TicketStatus.USED };
      ticketsRepository.findOne!.mockResolvedValue(usedTicket);

      await expect(service.verifyTicket('ticket-code-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ticket is CANCELLED', async () => {
      const cancelledTicket = {
        ...mockTicket,
        status: TicketStatus.CANCELLED,
      };
      ticketsRepository.findOne!.mockResolvedValue(cancelledTicket);

      await expect(service.verifyTicket('ticket-code-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
