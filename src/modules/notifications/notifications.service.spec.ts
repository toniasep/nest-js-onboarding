import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mailerService: jest.Mocked<Partial<MailerService>>;
  let mockQueue: { add: jest.Mock };

  beforeEach(async () => {
    mailerService = {
      sendMail: jest.fn(),
    };

    mockQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: MailerService, useValue: mailerService },
        { provide: getQueueToken('notifications'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── enqueueTicketEmail ─────────────────────────────────────

  describe('enqueueTicketEmail', () => {
    it('should enqueue a ticket email job', async () => {
      await service.enqueueTicketEmail(
        'order-1',
        'test@example.com',
        'Test User',
        'Concert',
        ['http://localhost:3000/api/tickets/1/download'],
      );

      expect(mockQueue.add).toHaveBeenCalledWith('send-ticket-email', {
        orderId: 'order-1',
        email: 'test@example.com',
        name: 'Test User',
        eventTitle: 'Concert',
        ticketUrls: ['http://localhost:3000/api/tickets/1/download'],
      });
    });
  });

  // ─── enqueuePaymentNotification ─────────────────────────────

  describe('enqueuePaymentNotification', () => {
    it('should enqueue a payment notification job', async () => {
      await service.enqueuePaymentNotification(
        'order-1',
        'test@example.com',
        'Test User',
        'EXPIRED',
      );

      expect(mockQueue.add).toHaveBeenCalledWith('send-payment-notification', {
        orderId: 'order-1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'EXPIRED',
      });
    });
  });

  // ─── enqueueEventReminder ───────────────────────────────────

  describe('enqueueEventReminder', () => {
    it('should enqueue an event reminder job', async () => {
      await service.enqueueEventReminder(
        'test@example.com',
        'Test User',
        'Concert',
        '2026-07-01T19:00:00.000Z',
        'Jakarta',
      );

      expect(mockQueue.add).toHaveBeenCalledWith('send-event-reminder', {
        email: 'test@example.com',
        name: 'Test User',
        eventTitle: 'Concert',
        eventDate: '2026-07-01T19:00:00.000Z',
        location: 'Jakarta',
      });
    });
  });

  // ─── sendTicketEmail ────────────────────────────────────────

  describe('sendTicketEmail', () => {
    it('should send ticket email via mailer', async () => {
      const data = {
        email: 'test@example.com',
        name: 'Test User',
        eventTitle: 'Concert',
        orderId: 'order-1',
        ticketUrls: ['http://localhost:3000/api/tickets/1/download'],
      };

      await service.sendTicketEmail(data);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: data.email,
        subject: `Your Tickets for ${data.eventTitle}`,
        template: './payment-success',
        context: {
          name: data.name,
          eventTitle: data.eventTitle,
          orderId: data.orderId,
          ticketUrls: data.ticketUrls,
        },
      });
    });

    it('should throw error when mailer fails', async () => {
      const error = new Error('SMTP connection failed');
      mailerService.sendMail!.mockRejectedValue(error);

      await expect(
        service.sendTicketEmail({ email: 'test@example.com', eventTitle: 'X' }),
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  // ─── sendPaymentNotification ────────────────────────────────

  describe('sendPaymentNotification', () => {
    it('should send expired order email when status is EXPIRED', async () => {
      const data = {
        email: 'test@example.com',
        name: 'Test User',
        orderId: 'order-1',
        status: 'EXPIRED',
      };

      await service.sendPaymentNotification(data);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: data.email,
        subject: `Order Expired - ${data.orderId}`,
        template: './order-expired',
        context: {
          name: data.name,
          orderId: data.orderId,
        },
      });
    });

    it('should not send email for non-EXPIRED status', async () => {
      const data = {
        email: 'test@example.com',
        name: 'Test User',
        orderId: 'order-1',
        status: 'PAID',
      };

      await service.sendPaymentNotification(data);

      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  // ─── sendEventReminder ──────────────────────────────────────

  describe('sendEventReminder', () => {
    it('should send event reminder email', async () => {
      const data = {
        email: 'test@example.com',
        name: 'Test User',
        eventTitle: 'Concert',
        eventDate: '2026-07-01T19:00:00.000Z',
        location: 'Jakarta',
      };

      await service.sendEventReminder(data);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: data.email,
        subject: `Reminder: ${data.eventTitle} is tomorrow!`,
        template: './event-reminder',
        context: {
          name: data.name,
          eventTitle: data.eventTitle,
          eventDate: data.eventDate,
          location: data.location,
        },
      });
    });

    it('should throw error when mailer fails', async () => {
      const error = new Error('SMTP error');
      mailerService.sendMail!.mockRejectedValue(error);

      await expect(
        service.sendEventReminder({
          email: 'test@example.com',
          eventTitle: 'X',
        }),
      ).rejects.toThrow('SMTP error');
    });
  });
});
