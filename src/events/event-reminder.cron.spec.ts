import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventReminderCron } from './event-reminder.cron';
import { Event } from './entities/event.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('EventReminderCron', () => {
  let cron: EventReminderCron;
  let eventsRepository: jest.Mocked<Partial<Repository<Event>>>;
  let ticketsRepository: jest.Mocked<Partial<Repository<Ticket>>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  const mockEvent = {
    id: 'event-uuid-1',
    title: 'Tomorrow Concert',
    location: 'Jakarta',
    eventDate: new Date(),
    isPublished: true,
  };

  const mockTicket1 = {
    id: 'ticket-1',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    status: TicketStatus.ACTIVE,
    user: { id: 'user-uuid-1', name: 'User 1', email: 'user1@example.com' },
  };

  const mockTicket2 = {
    id: 'ticket-2',
    userId: 'user-uuid-2',
    eventId: 'event-uuid-1',
    status: TicketStatus.ACTIVE,
    user: { id: 'user-uuid-2', name: 'User 2', email: 'user2@example.com' },
  };

  // Same user as ticket1, bought multiple tickets
  const mockTicket3 = {
    id: 'ticket-3',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    status: TicketStatus.ACTIVE,
    user: { id: 'user-uuid-1', name: 'User 1', email: 'user1@example.com' },
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    eventsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    ticketsRepository = {
      find: jest.fn(),
    };

    notificationsService = {
      enqueueEventReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventReminderCron,
        { provide: getRepositoryToken(Event), useValue: eventsRepository },
        { provide: getRepositoryToken(Ticket), useValue: ticketsRepository },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    cron = module.get<EventReminderCron>(EventReminderCron);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCron', () => {
    it('should find events happening tomorrow and send reminders', async () => {
      const qb = eventsRepository.createQueryBuilder!('event');
      (qb as any).getMany.mockResolvedValue([mockEvent]);
      ticketsRepository.find!.mockResolvedValue([
        mockTicket1,
        mockTicket2,
      ] as any);

      await cron.handleCron();

      expect(notificationsService.enqueueEventReminder).toHaveBeenCalledTimes(
        2,
      );
      expect(notificationsService.enqueueEventReminder).toHaveBeenCalledWith(
        'user1@example.com',
        'User 1',
        'Tomorrow Concert',
        expect.any(String),
        'Jakarta',
      );
      expect(notificationsService.enqueueEventReminder).toHaveBeenCalledWith(
        'user2@example.com',
        'User 2',
        'Tomorrow Concert',
        expect.any(String),
        'Jakarta',
      );
    });

    it('should skip duplicate reminders for same user (multiple tickets)', async () => {
      const qb = eventsRepository.createQueryBuilder!('event');
      (qb as any).getMany.mockResolvedValue([mockEvent]);
      ticketsRepository.find!.mockResolvedValue([
        mockTicket1,
        mockTicket3, // same user as ticket1
      ] as any);

      await cron.handleCron();

      // Should only send 1 reminder even though user has 2 tickets
      expect(notificationsService.enqueueEventReminder).toHaveBeenCalledTimes(
        1,
      );
      expect(notificationsService.enqueueEventReminder).toHaveBeenCalledWith(
        'user1@example.com',
        'User 1',
        'Tomorrow Concert',
        expect.any(String),
        'Jakarta',
      );
    });

    it('should handle no events found', async () => {
      const qb = eventsRepository.createQueryBuilder!('event');
      (qb as any).getMany.mockResolvedValue([]);

      await cron.handleCron();

      expect(ticketsRepository.find).not.toHaveBeenCalled();
      expect(notificationsService.enqueueEventReminder).not.toHaveBeenCalled();
    });
  });
});
