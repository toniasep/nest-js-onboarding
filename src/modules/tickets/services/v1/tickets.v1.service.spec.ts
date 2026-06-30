import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { TicketsService } from './tickets.v1.service';
import { TicketRepository } from '../../repositories/v1/tickets.v1.repository';
import { TicketOrderRepository } from '../../repositories/v1/ticket-order.v1.repository';
import {
  Ticket,
  TicketStatus,
} from '../../../../infrastructures/databases/entities/ticket.entity';
import { MinioService } from '../../../../infrastructures/modules/storage/minio.service';
import { NotificationsService } from '../../../notifications/services/v1/notifications.v1.service';
import { QueueName } from '../../../../shared/enums/queue-name.enum';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: jest.Mocked<Partial<TicketRepository>>;
  let ticketOrderRepository: jest.Mocked<Partial<TicketOrderRepository>>;
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
    order: {} as any,
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
    ticketRepository = {
      findAllByUser: jest.fn(),
      findById: jest.fn(),
      findByTicketCode: jest.fn(),
      save: jest.fn(),
      markAsUsed: jest.fn(),
    };

    ticketOrderRepository = {
      findByIdWithRelations: jest.fn(),
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
        { provide: TicketRepository, useValue: ticketRepository },
        { provide: TicketOrderRepository, useValue: ticketOrderRepository },
        { provide: getQueueToken(QueueName.TICKETS), useValue: mockQueue },
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
      (ticketRepository.findAllByUser as jest.Mock).mockResolvedValue([
        mockTicket,
      ]);

      const result = await service.findAllByUser('user-uuid-1');

      expect(result).toEqual([mockTicket]);
      expect(ticketRepository.findAllByUser).toHaveBeenCalledWith(
        'user-uuid-1',
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a ticket when found', async () => {
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      const result = await service.findOne('ticket-uuid-1');

      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      (ticketRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      await expect(
        service.findOne('ticket-uuid-1', 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return ticket when userId matches', async () => {
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      const result = await service.findOne('ticket-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockTicket);
    });
  });

  // ─── downloadTicketPdf ──────────────────────────────────────

  describe('downloadTicketPdf', () => {
    it('should return stream and ticketCode for valid ticket', async () => {
      const mockStream = { pipe: jest.fn() } as any;
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (minioService.getFileStream as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.downloadTicketPdf('ticket-uuid-1');

      expect(result.stream).toEqual(mockStream);
      expect(result.ticketCode).toEqual(mockTicket.ticketCode);
    });

    it('should throw BadRequestException when PDF not yet generated', async () => {
      const ticketNoPdf = { ...mockTicket, pdfUrl: null };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(ticketNoPdf);

      await expect(service.downloadTicketPdf('ticket-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── verifyTicket ───────────────────────────────────────────

  describe('verifyTicket', () => {
    it('should verify an active ticket and mark as USED', async () => {
      const activeTicket = { ...mockTicket, status: TicketStatus.ACTIVE };
      const usedTicket = { ...activeTicket, status: TicketStatus.USED };
      (ticketRepository.findByTicketCode as jest.Mock).mockResolvedValue(
        activeTicket,
      );
      (ticketRepository.markAsUsed as jest.Mock).mockResolvedValue(usedTicket);

      const result = await service.verifyTicket('ticket-code-uuid');

      expect(ticketRepository.markAsUsed).toHaveBeenCalledWith(activeTicket);
      expect(result.status).toEqual(TicketStatus.USED);
    });

    it('should throw NotFoundException when ticket code not found', async () => {
      (ticketRepository.findByTicketCode as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyTicket('invalid-code')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when ticket already USED', async () => {
      const usedTicket = { ...mockTicket, status: TicketStatus.USED };
      (ticketRepository.findByTicketCode as jest.Mock).mockResolvedValue(
        usedTicket,
      );

      await expect(service.verifyTicket('ticket-code-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ticket is CANCELLED', async () => {
      const cancelledTicket = {
        ...mockTicket,
        status: TicketStatus.CANCELLED,
      };
      (ticketRepository.findByTicketCode as jest.Mock).mockResolvedValue(
        cancelledTicket,
      );

      await expect(service.verifyTicket('ticket-code-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
