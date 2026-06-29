import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

import { Ticket, TicketStatus } from './entities/ticket.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { GenerateTicketDto } from './dto/generate-ticket.dto.js';
import { QueueName } from '../../common/enums/queue-name.enum.js';
import { OrderStatus } from '../../common/enums/order-status.enum.js';
import { MinioService } from '../../infrastructures/minio/minio.service.js';
import { TICKETS_BUCKET } from '../../infrastructures/minio/minio.constants.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TicketRepository } from './repositories/ticket.repository.js';
import { TicketOrderRepository } from './repositories/ticket-order.repository.js';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketOrderRepository: TicketOrderRepository,
    @InjectQueue(QueueName.TICKETS) private readonly ticketsQueue: Queue,
    private readonly minioService: MinioService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async generateTicketsForOrder(orderId: string): Promise<void> {
    const generateTicketDto: GenerateTicketDto = { orderId };
    await this.ticketsQueue.add('generate-tickets', generateTicketDto);
    this.logger.log(`Enqueued ticket generation for order ${orderId}`);
  }

  async createTickets(orderId: string): Promise<void> {
    const order =
      await this.ticketOrderRepository.findByIdWithRelations(orderId);

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.status !== OrderStatus.PAID) {
      this.logger.warn(
        `Order ${orderId} is not PAID, skipping ticket generation`,
      );
      return;
    }

    const existingCount = await this.ticketRepository.countByOrderId(orderId);
    if (existingCount > 0) {
      this.logger.warn(
        `Tickets already generated for order ${orderId}, skipping`,
      );
      return;
    }

    const createdTickets: Ticket[] = [];
    for (let i = 0; i < order.quantity; i++) {
      createdTickets.push(await this.createSingleTicket(order, i + 1));
    }

    this.logger.log(
      `Generated ${order.quantity} ticket(s) for order ${orderId}`,
    );

    const ticketUrls = createdTickets.map(
      (t) => `http://localhost:3000/api/tickets/${t.id}/download`,
    );
    await this.notificationsService.enqueueTicketEmail(
      orderId,
      order.user.email,
      order.user.name,
      order.event.title,
      ticketUrls,
    );
  }

  private async createSingleTicket(
    order: Order,
    index: number,
  ): Promise<Ticket> {
    const ticketCode = randomUUID();

    const ticket = this.ticketRepository.create({
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId,
      ticketCode,
      status: TicketStatus.ACTIVE,
    });
    const savedTicket = await this.ticketRepository.save(ticket);

    const qrBuffer = await this.generateQrCode(ticketCode);
    const pdfBuffer = await this.generatePdf(
      order,
      ticketCode,
      qrBuffer,
      index,
    );

    const qrObjectName = `qr/${ticketCode}.png`;
    const pdfObjectName = `pdf/${ticketCode}.pdf`;

    await this.minioService.uploadFile(
      TICKETS_BUCKET,
      qrObjectName,
      qrBuffer,
      'image/png',
    );
    await this.minioService.uploadFile(
      TICKETS_BUCKET,
      pdfObjectName,
      pdfBuffer,
      'application/pdf',
    );

    savedTicket.qrCodeUrl = qrObjectName;
    savedTicket.pdfUrl = pdfObjectName;
    await this.ticketRepository.save(savedTicket);

    this.logger.debug(
      `Created ticket ${ticketCode} (${index}/${order.quantity})`,
    );
    return savedTicket;
  }

  private async generateQrCode(ticketCode: string): Promise<Buffer> {
    return QRCode.toBuffer(ticketCode, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  private async generatePdf(
    order: Order,
    ticketCode: string,
    qrBuffer: Buffer,
    index: number,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('EVENT TICKET', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .strokeColor('#333333')
        .lineWidth(2)
        .stroke();
      doc.moveDown(1);

      doc.fontSize(16).font('Helvetica-Bold').text(order.event.title);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#555555');

      const eventDate = new Date(order.event.eventDate);
      const formattedDate = eventDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.text(`${formattedDate}`);
      doc.text(`${order.event.location}`);
      doc.moveDown(1);

      doc.fillColor('#000000');
      doc.fontSize(11).font('Helvetica-Bold').text('Pemegang Tiket:');
      doc.fontSize(11).font('Helvetica').text(order.user.name);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold').text('Tiket:');
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`${index} dari ${order.quantity}`);
      doc.moveDown(1);

      doc.fontSize(9).font('Helvetica').fillColor('#888888');
      doc.text(`Ticket Code: ${ticketCode}`, { align: 'center' });
      doc.moveDown(0.5);

      const qrSize = 150;
      const qrX = (doc.page.width - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });

      doc.y = doc.y + qrSize + 20;
      doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa');
      doc.text('Tunjukkan QR Code ini saat masuk venue.', { align: 'center' });
      doc.text('Tiket ini tidak dapat dipindahtangankan.', { align: 'center' });

      doc.end();
    });
  }

  async findAllByUser(userId: string): Promise<Ticket[]> {
    return this.ticketRepository.findAllByUser(userId);
  }

  async findOne(id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(id);

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async downloadTicketPdf(
    id: string,
    userId?: string,
  ): Promise<{ stream: Readable; ticketCode: string }> {
    const ticket = await this.findOne(id, userId);

    if (!ticket.pdfUrl)
      throw new BadRequestException('Ticket PDF is not yet generated');

    const stream = await this.minioService.getFileStream(
      TICKETS_BUCKET,
      ticket.pdfUrl,
    );
    return { stream, ticketCode: ticket.ticketCode };
  }

  async verifyTicket(ticketCode: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findByTicketCode(ticketCode);

    if (!ticket)
      throw new NotFoundException('Ticket not found or invalid QR code');
    if (ticket.status === TicketStatus.USED)
      throw new BadRequestException('Ticket has already been used');
    if (ticket.status === TicketStatus.CANCELLED)
      throw new BadRequestException('Ticket has been cancelled');

    const updated = await this.ticketRepository.markAsUsed(ticket);
    this.logger.log(`Ticket ${ticketCode} verified and marked as USED`);
    return updated;
  }
}
