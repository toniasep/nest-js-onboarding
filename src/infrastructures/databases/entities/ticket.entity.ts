import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { Event } from './event.entity.js';
import { Order } from './order.entity.js';

/**
 * Enum untuk status tiket
 */
export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}

/**
 * Ticket Entity
 *
 * Menyimpan data tiket individual per order quantity.
 * Setiap tiket memiliki QR Code unik dan PDF yang di-upload ke Minio.
 *
 * Referensi: rules.md §3 — Repository Pattern & Data Mapper
 */
import { ITicket } from '../interfaces/ticket.interface.js';

@Entity('tickets')
export class Ticket implements ITicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'uuid', unique: true })
  ticketCode!: string;

  @Column({ type: 'text', nullable: true })
  qrCodeUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  pdfUrl!: string | null;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
  })
  status!: TicketStatus;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
