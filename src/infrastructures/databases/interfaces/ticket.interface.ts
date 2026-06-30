import { IBaseEntity } from './base-entity.interface.js';
import { IUser } from './user.interface.js';
import { IEvent } from './event.interface.js';
import { IOrder } from './order.interface.js';
import { TicketStatus } from '../entities/ticket.entity.js';

export interface ITicket extends IBaseEntity {
  orderId: string;
  userId: string;
  eventId: string;
  ticketCode: string;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  status: TicketStatus;
  order?: IOrder;
  user?: IUser;
  event?: IEvent;
}
