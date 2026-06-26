import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketStatus } from './entities/ticket.entity';

describe('TicketsController', () => {
  let controller: TicketsController;
  let ticketsService: jest.Mocked<Partial<TicketsService>>;

  const mockTicket = {
    id: 'ticket-uuid-1',
    orderId: 'order-uuid-1',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    ticketCode: 'ticket-code-uuid',
    status: TicketStatus.ACTIVE,
  };

  beforeEach(async () => {
    ticketsService = {
      findAllByUser: jest.fn(),
      findOne: jest.fn(),
      downloadTicketPdf: jest.fn(),
      verifyTicket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all tickets for the current user', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      ticketsService.findAllByUser!.mockResolvedValue([mockTicket] as any);

      const result = await controller.findAll(req);

      expect(result).toEqual([mockTicket]);
      expect(ticketsService.findAllByUser).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('findOne', () => {
    it('should return a ticket by id for the current user', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      ticketsService.findOne!.mockResolvedValue(mockTicket as any);

      const result = await controller.findOne('ticket-uuid-1', req);

      expect(result).toEqual(mockTicket);
      expect(ticketsService.findOne).toHaveBeenCalledWith(
        'ticket-uuid-1',
        'user-uuid-1',
      );
    });
  });

  describe('verify', () => {
    it('should verify a ticket by ticketCode', async () => {
      const verifiedTicket = { ...mockTicket, status: TicketStatus.USED };
      ticketsService.verifyTicket!.mockResolvedValue(verifiedTicket as any);

      const result = await controller.verify({
        ticketCode: 'ticket-code-uuid',
      });

      expect(result).toEqual(verifiedTicket);
      expect(ticketsService.verifyTicket).toHaveBeenCalledWith(
        'ticket-code-uuid',
      );
    });
  });
});
