import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventCategory } from './event-category.entity.js';

/**
 * Event Entity
 *
 * Menyimpan data event beserta relasinya ke EventCategory.
 *
 * Referensi: rules.md §3 — Repository Pattern & Data Mapper
 */
import { IEvent } from '../interfaces/event.interface.js';

@Entity('events')
export class Event implements IEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 255 })
  location!: string;

  @Column({ type: 'timestamp' })
  eventDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'int' })
  quota!: number;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => EventCategory, (category) => category.events)
  @JoinColumn({ name: 'categoryId' })
  category!: EventCategory;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
