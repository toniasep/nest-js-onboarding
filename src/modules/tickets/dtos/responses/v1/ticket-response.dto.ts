import { TicketStatus } from '../../../../../infrastructures/databases/entities/ticket.entity.js';
import { ITicket } from '../../../../../infrastructures/databases/interfaces/ticket.interface.js';

export class TicketResponseDto {
  id!: string;
  orderId!: string;
  userId!: string;
  eventId!: string;
  ticketCode!: string;
  qrCodeUrl!: string | null;
  pdfUrl!: string | null;
  status!: TicketStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(entity: ITicket) {
    this.id = entity.id;
    this.orderId = entity.orderId;
    this.userId = entity.userId;
    this.eventId = entity.eventId;
    this.ticketCode = entity.ticketCode;
    this.qrCodeUrl = entity.qrCodeUrl;
    this.pdfUrl = entity.pdfUrl;
    this.status = entity.status;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static MapEntity(entity: ITicket): TicketResponseDto {
    return new TicketResponseDto(entity);
  }

  static MapEntities(entities: ITicket[]): TicketResponseDto[] {
    return entities.map((item) => new TicketResponseDto(item));
  }
}
