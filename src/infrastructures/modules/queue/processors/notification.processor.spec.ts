import { NotificationProcessor } from './notification.processor';
import { NotificationsService } from '../../../../modules/notifications/services/v1/notifications.v1.service';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  beforeEach(() => {
    notificationsService = {
      sendTicketEmail: jest.fn(),
      sendPaymentNotification: jest.fn(),
      sendEventReminder: jest.fn(),
    };

    processor = new NotificationProcessor(
      notificationsService as NotificationsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should call sendTicketEmail for send-ticket-email job', async () => {
      const jobData = { email: 'test@example.com', eventTitle: 'Concert' };
      const job = { id: 'job-1', name: 'send-ticket-email', data: jobData };

      await processor.process(job as any);

      expect(notificationsService.sendTicketEmail).toHaveBeenCalledWith(
        jobData,
      );
    });

    it('should call sendPaymentNotification for send-payment-notification job', async () => {
      const jobData = {
        email: 'test@example.com',
        orderId: 'order-1',
        status: 'EXPIRED',
      };
      const job = {
        id: 'job-2',
        name: 'send-payment-notification',
        data: jobData,
      };

      await processor.process(job as any);

      expect(notificationsService.sendPaymentNotification).toHaveBeenCalledWith(
        jobData,
      );
    });

    it('should call sendEventReminder for send-event-reminder job', async () => {
      const jobData = { email: 'test@example.com', eventTitle: 'Concert' };
      const job = { id: 'job-3', name: 'send-event-reminder', data: jobData };

      await processor.process(job as any);

      expect(notificationsService.sendEventReminder).toHaveBeenCalledWith(
        jobData,
      );
    });

    it('should re-throw error when processing fails', async () => {
      const error = new Error('Email send failed');
      notificationsService.sendTicketEmail!.mockRejectedValue(error);

      const job = {
        id: 'job-4',
        name: 'send-ticket-email',
        data: { email: 'test@example.com' },
      };

      await expect(processor.process(job as any)).rejects.toThrow(
        'Email send failed',
      );
    });
  });
});
