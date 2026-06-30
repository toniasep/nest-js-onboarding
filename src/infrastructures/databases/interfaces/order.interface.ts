import { IBaseEntity } from './base-entity.interface.js';
import { IUser } from './user.interface.js';
import { IEvent } from './event.interface.js';
import { OrderStatus } from '../../../shared/enums/order-status.enum.js';

export interface IOrder extends IBaseEntity {
  userId: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  paymentUrl: string | null;
  xenditInvoiceId: string | null;
  user?: IUser;
  event?: IEvent;
}
