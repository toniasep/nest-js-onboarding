import { Test, TestingModule } from '@nestjs/testing';
import { EventReminderCron } from './event-reminder.cron';
import { EventRepository } from './repositories/v1/events.v1.repository';
import { ReminderTicketRepository } from './repositories/v1/reminder-ticket.v1.repository';
import { NotificationsService } from '../notifications/services/v1/notifications.v1.service';
import { TicketStatus } from '../../infrastructures/databases/entities/ticket.entity';

describe('EventReminderCron', () => {
  let cron: EventReminderCron;
  let eventRepository: jest.Mocked<Partial<EventRepository>>;
  let reminderTicketRepository: jest.Mocked<Partial<ReminderTicketRepository>>;
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

  const mockTicket3 = {
    id: 'ticket-3',
    userId: 'user-uuid-1',
    eventId: 'event-uuid-1',
    status: TicketStatus.ACTIVE,
    user: { id: 'user-uuid-1', name: 'User 1', email: 'user1@example.com' },
  };

  beforeEach(async () => {
    eventRepository = {
      findEventsTomorrow: jest.fn(),
    };

    reminderTicketRepository = {
      findActiveTicketsByEventId: jest.fn(),
    };

    notificationsService = {
      enqueueEventReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventReminderCron,
        { provide: EventRepository, useValue: eventRepository },
        {
          provide: ReminderTicketRepository,
          useValue: reminderTicketRepository,
        },
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
      (eventRepository.findEventsTomorrow as jest.Mock).mockResolvedValue([
        mockEvent,
      ]);
      (
        reminderTicketRepository.findActiveTicketsByEventId as jest.Mock
      ).mockResolvedValue([mockTicket1, mockTicket2] as any);

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
      (eventRepository.findEventsTomorrow as jest.Mock).mockResolvedValue([
        mockEvent,
      ]);
      (
        reminderTicketRepository.findActiveTicketsByEventId as jest.Mock
      ).mockResolvedValue([mockTicket1, mockTicket3] as any);

      await cron.handleCron();

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
      (eventRepository.findEventsTomorrow as jest.Mock).mockResolvedValue([]);

      await cron.handleCron();

      expect(
        reminderTicketRepository.findActiveTicketsByEventId,
      ).not.toHaveBeenCalled();
      expect(notificationsService.enqueueEventReminder).not.toHaveBeenCalled();
    });
  });
});
