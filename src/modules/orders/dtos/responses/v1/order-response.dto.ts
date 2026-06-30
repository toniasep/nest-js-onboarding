import { OrderStatus } from '../../../../../shared/enums/order-status.enum.js';
import { EventResponseDto } from '../../../../events/dtos/responses/v1/event-response.dto.js';
import { UserResponseDto } from '../../../../users/dtos/responses/v1/user-response.dto.js';
import { IOrder } from '../../../../../infrastructures/databases/interfaces/order.interface.js';

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

  constructor(entity: IOrder) {
    this.id = entity.id;
    this.userId = entity.userId;
    this.eventId = entity.eventId;
    this.quantity = entity.quantity;
    this.totalAmount = entity.totalAmount;
    this.status = entity.status;
    this.paymentUrl = entity.paymentUrl;
    this.xenditInvoiceId = entity.xenditInvoiceId;

    if (entity.event) {
      this.event = EventResponseDto.MapEntity(entity.event);
    }

    if (entity.user) {
      this.user = UserResponseDto.MapEntity(entity.user);
    }

    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static MapEntity(entity: IOrder): OrderResponseDto {
    return new OrderResponseDto(entity);
  }

  static MapEntities(entities: IOrder[]): OrderResponseDto[] {
    return entities.map((item) => new OrderResponseDto(item));
  }
}
