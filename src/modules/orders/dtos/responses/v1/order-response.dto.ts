import { OrderStatus } from '../../../../../shared/enums/order-status.enum.js';
import { EventResponseDto } from '../../../../events/dtos/responses/v1/event-response.dto.js';
import { UserResponseDto } from '../../../../users/dtos/responses/v1/user-response.dto.js';

export class OrderResponseDto {
  id!: string;
  userId!: string;
  eventId!: string;
  quantity!: number;
  totalAmount!: number;
  status!: OrderStatus;
  paymentUrl!: string | null;
  xenditInvoiceId!: string | null;
  event?: EventResponseDto;
  user?: UserResponseDto;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}
