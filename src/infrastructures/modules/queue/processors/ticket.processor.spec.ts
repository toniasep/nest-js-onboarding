import { TicketProcessor } from './ticket.processor';
import { TicketsService } from '../../../../modules/tickets/services/v1/tickets.v1.service';

describe('TicketProcessor', () => {
  let processor: TicketProcessor;
  let ticketsService: jest.Mocked<Partial<TicketsService>>;

  beforeEach(() => {
    ticketsService = {
      createTickets: jest.fn(),
    };

    processor = new TicketProcessor(ticketsService as TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should call createTickets for generate-tickets job', async () => {
      const job = {
        id: 'job-1',
        name: 'generate-tickets',
        data: { orderId: 'order-uuid-1' },
      };

      await processor.process(job as any);

      expect(ticketsService.createTickets).toHaveBeenCalledWith('order-uuid-1');
    });

    it('should re-throw error when createTickets fails', async () => {
      const error = new Error('Ticket generation failed');
      ticketsService.createTickets!.mockRejectedValue(error);

      const job = {
        id: 'job-2',
        name: 'generate-tickets',
        data: { orderId: 'order-uuid-1' },
      };

      await expect(processor.process(job as any)).rejects.toThrow(
        'Ticket generation failed',
      );
    });

    it('should not call createTickets for other job types', async () => {
      const job = {
        id: 'job-3',
        name: 'unknown-job',
        data: {},
      };

      await processor.process(job as any);

      expect(ticketsService.createTickets).not.toHaveBeenCalled();
    });
  });
});
