import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

import { Ticket, TicketStatus } from './entities/ticket.entity.js';
import { Order, OrderStatus } from '../orders/entities/order.entity.js';
import { MinioService } from '../minio/minio.service.js';
import { TICKETS_BUCKET } from '../minio/minio.constants.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { forwardRef, Inject } from '@nestjs/common';

/**
 * TicketsService
 *
 * Business logic untuk ticketing:
 * - Generate tiket setelah payment PAID (via BullMQ)
 * - QR Code generation, PDF generation, upload ke Minio
 * - CRUD tiket untuk user
 * - Verifikasi tiket oleh Admin (scan QR)
 *
 * Referensi: rules.md §1 — Services contain business logic
 * Referensi: rules.md §6 — Async/Await, BullMQ Worker
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectQueue('tickets') private readonly ticketsQueue: Queue,
    private readonly minioService: MinioService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Enqueue BullMQ job untuk generate tiket.
   * Dipanggil setelah payment berhasil (webhook).
   */
  async generateTicketsForOrder(orderId: string): Promise<void> {
    await this.ticketsQueue.add('generate-tickets', { orderId });
    this.logger.log(`Enqueued ticket generation for order ${orderId}`);
  }

  /**
   * Logic utama generate tiket — dipanggil oleh TicketProcessor.
   *
   * Flow:
   * 1. Fetch order + relasi user & event
   * 2. Guard: order harus PAID
   * 3. Loop per quantity → create Ticket, generate QR, generate PDF, upload Minio
   */
  async createTickets(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { user: true, event: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PAID) {
      this.logger.warn(
        `Order ${orderId} is not PAID, skipping ticket generation`,
      );
      return;
    }

    // Check apakah tiket sudah pernah di-generate
    const existingTickets = await this.ticketsRepository.count({
      where: { orderId },
    });
    if (existingTickets > 0) {
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

    // Enqueue notification email
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

  /**
   * Generate 1 tiket individual: create record, QR, PDF, upload.
   */
  private async createSingleTicket(
    order: Order,
    index: number,
  ): Promise<Ticket> {
    const ticketCode = randomUUID();

    // 1. Create ticket record di DB
    const ticket = this.ticketsRepository.create({
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId,
      ticketCode,
      status: TicketStatus.ACTIVE,
    });
    const savedTicket = await this.ticketsRepository.save(ticket);

    // 2. Generate QR Code PNG buffer
    const qrBuffer = await this.generateQrCode(ticketCode);

    // 3. Generate PDF buffer
    const pdfBuffer = await this.generatePdf(
      order,
      ticketCode,
      qrBuffer,
      index,
    );

    // 4. Upload ke Minio
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

    // 5. Update ticket record dengan URL
    savedTicket.qrCodeUrl = qrObjectName;
    savedTicket.pdfUrl = pdfObjectName;
    await this.ticketsRepository.save(savedTicket);

    this.logger.debug(
      `Created ticket ${ticketCode} (${index}/${order.quantity})`,
    );
    return savedTicket;
  }

  /**
   * Generate QR Code sebagai PNG buffer.
   */
  private async generateQrCode(ticketCode: string): Promise<Buffer> {
    return QRCode.toBuffer(ticketCode, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * Generate PDF tiket menggunakan PDFKit.
   *
   * Konten PDF:
   * - Header: "EVENT TICKET"
   * - Info event: title, date, location
   * - Info pemegang: nama user
   * - Ticket code
   * - QR Code image
   */
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

      // ─── Header ───────────────────────────────────────────
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

      // ─── Event Info ───────────────────────────────────────
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

      // ─── Attendee Info ────────────────────────────────────
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

      // ─── Ticket Code ──────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#888888');
      doc.text(`Ticket Code: ${ticketCode}`, { align: 'center' });
      doc.moveDown(0.5);

      // ─── QR Code ──────────────────────────────────────────
      const qrSize = 150;
      const qrX = (doc.page.width - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
      doc.moveDown(1);

      // ─── Footer ───────────────────────────────────────────
      doc.y = doc.y + qrSize + 20;
      doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa');
      doc.text('Tunjukkan QR Code ini saat masuk venue.', { align: 'center' });
      doc.text('Tiket ini tidak dapat dipindahtangankan.', { align: 'center' });

      doc.end();
    });
  }

  // ─── CRUD Operations ──────────────────────────────────────

  /**
   * List semua tiket milik user.
   */
  async findAllByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { userId },
      relations: { event: true, order: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get detail tiket by ID.
   * Jika userId diberikan, validasi ownership.
   */
  async findOne(id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: { event: true, order: true, user: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Download PDF tiket sebagai stream dari Minio.
   */
  async downloadTicketPdf(
    id: string,
    userId?: string,
  ): Promise<{ stream: Readable; ticketCode: string }> {
    const ticket = await this.findOne(id, userId);

    if (!ticket.pdfUrl) {
      throw new BadRequestException('Ticket PDF is not yet generated');
    }

    const stream = await this.minioService.getFileStream(
      TICKETS_BUCKET,
      ticket.pdfUrl,
    );

    return { stream, ticketCode: ticket.ticketCode };
  }

  /**
   * Verifikasi tiket oleh Admin (scan QR Code).
   *
   * Flow:
   * 1. Cari tiket by ticketCode
   * 2. Guard: harus ACTIVE
   * 3. Update status ke USED
   */
  async verifyTicket(ticketCode: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { ticketCode },
      relations: { event: true, user: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found or invalid QR code');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Ticket has already been used');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ticket has been cancelled');
    }

    ticket.status = TicketStatus.USED;
    await this.ticketsRepository.save(ticket);

    this.logger.log(`Ticket ${ticketCode} verified and marked as USED`);
    return ticket;
  }
}
