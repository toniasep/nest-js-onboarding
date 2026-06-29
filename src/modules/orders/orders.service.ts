import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { XenditService } from '../../infrastructures/xendit/xendit.service.js';

import { Order } from './entities/order.entity.js';
import { OrderStatus } from '../../common/enums/order-status.enum.js';
import { XenditStatus } from '../../common/enums/xendit-status.enum.js';
import { QueueName } from '../../common/enums/queue-name.enum.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateXenditInvoiceDto } from './dto/create-xendit-invoice.dto.js';
import { ExpireOrderDto } from './dto/expire-order.dto.js';
import { User } from '../users/entities/user.entity.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrderRepository } from './repositories/order.repository.js';
import { OrderEventRepository } from './repositories/order-event.repository.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderEventRepository: OrderEventRepository,
    private readonly dataSource: DataSource,
    @InjectQueue(QueueName.ORDERS)
    private ordersQueue: Queue,
    private xenditService: XenditService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    createDto: CreateOrderDto,
    email: string,
  ): Promise<Order> {
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const event = await this.orderEventRepository.findByIdWithLock(
        createDto.eventId,
        manager,
      );

      if (!event) throw new NotFoundException('Event not found');
      if (!event.isPublished)
        throw new BadRequestException('Event is not published');
      if (event.quota < createDto.quantity)
        throw new BadRequestException('Not enough quota');

      event.quota -= createDto.quantity;
      await this.orderEventRepository.save(event, manager);

      const totalAmount = Number(event.price) * createDto.quantity;
      const order = this.orderRepository.createEntity(
        {
          userId,
          eventId: event.id,
          quantity: createDto.quantity,
          totalAmount,
          status: OrderStatus.PENDING,
        },
        manager,
      );

      return this.orderRepository.save(order, manager);
    });

    const event = await this.orderEventRepository.findById(savedOrder.eventId);

    const invoiceDto: CreateXenditInvoiceDto = {
      orderId: savedOrder.id,
      amount: savedOrder.totalAmount,
      payerEmail: email,
      description: `Payment for Event: ${event?.title || 'Unknown'}`,
    };

    await this.ordersQueue.add('create-xendit-invoice', invoiceDto);

    return savedOrder;
  }

  async processXenditInvoice(dto: CreateXenditInvoiceDto): Promise<void> {
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) return;

    try {
      const invoice = await this.xenditService.client.Invoice.createInvoice({
        data: {
          externalId: dto.orderId,
          amount: dto.amount,
          payerEmail: dto.payerEmail,
          description: dto.description,
          invoiceDuration: 900,
        },
      });

      order.paymentUrl = invoice.invoiceUrl || null;
      order.xenditInvoiceId = invoice.id || null;
      order.status = OrderStatus.WAITING_PAYMENT;
      await this.orderRepository.save(order);

      const expireOrderDto: ExpireOrderDto = { orderId: order.id };
      await this.ordersQueue.add('expire-order', expireOrderDto, {
        delay: 15 * 60 * 1000,
      });
    } catch (error) {
      this.logger.error('Failed to create Xendit Invoice in processor', error);
      order.status = OrderStatus.CANCEL;
      await this.orderRepository.save(order);

      await this.dataSource.transaction(async (manager) => {
        const event = await this.orderEventRepository.findByIdWithLock(
          order.eventId,
          manager,
        );
        if (event) {
          event.quota += order.quantity;
          await this.orderEventRepository.save(event, manager);
        }
      });
    }
  }

  async findAllByUser(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderRepository.findAllByUser(userId, paginationDto);
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAllAdmin(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderRepository.findAllAdmin(paginationDto);
  }

  async handleWebhook(body: {
    external_id?: string;
    status?: string;
  }): Promise<void> {
    const externalId = body.external_id;
    const status = body.status;

    if (!externalId) return;

    const order = await this.orderRepository.findById(externalId);
    if (!order) return;

    if (status === XenditStatus.PAID || status === XenditStatus.SETTLED) {
      order.status = OrderStatus.PAID;
      await this.orderRepository.save(order);
      await this.ticketsService.generateTicketsForOrder(order.id);
    } else if (status === XenditStatus.EXPIRED) {
      await this.expireOrder(order.id);
    }
  }

  async expireOrder(orderId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.orderRepository.findByIdWithLock(
        orderId,
        manager,
      );
      if (!order) return;
      if (order.status !== OrderStatus.PENDING) return;

      const user = await manager.findOne(User, { where: { id: order.userId } });

      order.status = OrderStatus.EXPIRED;
      await this.orderRepository.save(order, manager);

      const event = await this.orderEventRepository.findByIdWithLock(
        order.eventId,
        manager,
      );
      if (event) {
        event.quota += order.quantity;
        await this.orderEventRepository.save(event, manager);
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
