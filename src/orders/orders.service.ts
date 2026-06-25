import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Xendit } from 'xendit-node';
import { ConfigService } from '@nestjs/config';

import { Order, OrderStatus } from './entities/order.entity.js';
import { Event } from '../events/entities/event.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { User } from '../users/entities/user.entity.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private xendit: Xendit;

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    @InjectQueue('orders') private ordersQueue: Queue,
    private configService: ConfigService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    this.xendit = new Xendit({
      secretKey: this.configService.get<string>('XENDIT_SECRET_KEY') || '',
    });
  }

  async create(userId: string, createDto: CreateOrderDto, email: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Lock event
      const event = await manager.findOne(Event, {
        where: { id: createDto.eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!event) throw new NotFoundException('Event not found');
      if (!event.isPublished) throw new BadRequestException('Event is not published');
      if (event.quota < createDto.quantity) throw new BadRequestException('Not enough quota');

      // 2. Decrease quota
      event.quota -= createDto.quantity;
      await manager.save(event);

      // 3. Create Order
      const totalAmount = Number(event.price) * createDto.quantity;
      const order = manager.create(Order, {
        userId,
        eventId: event.id,
        quantity: createDto.quantity,
        totalAmount,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(order);

      // 4. Create Xendit Invoice
      try {
        const invoice = await this.xendit.Invoice.createInvoice({
          data: {
            externalId: savedOrder.id,
            amount: totalAmount,
            payerEmail: email,
            description: `Payment for Event: ${event.title}`,
            invoiceDuration: 900, // 15 mins
          }
        });

        savedOrder.paymentUrl = invoice.invoiceUrl || null;
        savedOrder.xenditInvoiceId = invoice.id || null;
        await manager.save(savedOrder);
      } catch (error) {
        this.logger.error('Failed to create Xendit Invoice', error);
        throw new BadRequestException('Failed to generate payment invoice');
      }

      // 5. Enqueue delayed job (15 mins)
      await this.ordersQueue.add(
        'expire-order',
        { orderId: savedOrder.id },
        { delay: 15 * 60 * 1000 },
      );

      return savedOrder;
    });
  }

  async findAllByUser(userId: string) {
    return this.ordersRepository.find({
      where: { userId },
      relations: { event: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { event: true, user: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAllAdmin() {
    return this.ordersRepository.find({
      relations: { event: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async handleWebhook(body: any) {
    const externalId = body.external_id;
    const status = body.status;

    if (!externalId) return;

    const order = await this.ordersRepository.findOne({ where: { id: externalId } });
    if (!order) return;

    if (status === 'PAID' || status === 'SETTLED') {
      order.status = OrderStatus.PAID;
      await this.ordersRepository.save(order);
      // Trigger ticket generation via BullMQ
      await this.ticketsService.generateTicketsForOrder(order.id);
    } else if (status === 'EXPIRED') {
      await this.expireOrder(order.id);
    }
  }

  async expireOrder(orderId: string) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) return;
      if (order.status !== OrderStatus.PENDING) return; // Already paid or expired

      // Fetch user separately to avoid FOR UPDATE on outer join error
      const user = await manager.findOne(User, { where: { id: order.userId } });

      order.status = OrderStatus.EXPIRED;
      await manager.save(order);

      const event = await manager.findOne(Event, {
        where: { id: order.eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (event) {
        event.quota += order.quantity;
        await manager.save(event);
      }

      if (user) {
        await this.notificationsService.enqueuePaymentNotification(
          order.id,
          user.email,
          user.name,
          OrderStatus.EXPIRED,
        );
      }
    });
  }
}
