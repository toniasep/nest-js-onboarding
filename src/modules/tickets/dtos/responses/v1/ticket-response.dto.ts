import { TicketStatus } from '../../../../../infrastructures/databases/entities/ticket.entity.js';

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

  constructor(partial: Partial<TicketResponseDto>) {
    Object.assign(this, partial);
  }
}
