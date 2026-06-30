import { OrderStatus } from '../../../../../shared/enums/order-status.enum.js';

export class SendTicketEmailDto {
  orderId!: string;
  email!: string;
  name!: string;
  eventTitle!: string;
  ticketUrls!: string[];
}

export class SendPaymentNotificationDto {
  orderId!: string;
  email!: string;
  name!: string;
  status!: OrderStatus;
}

export class SendEventReminderDto {
  email!: string;
  name!: string;
  eventTitle!: string;
  eventDate!: string;
  location!: string;
}
