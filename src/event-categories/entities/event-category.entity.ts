import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity.js';

/**
 * Event Category Entity
 *
 * Menyimpan data kategori event (misal: Konser, Seminar).
 *
 * Referensi: rules.md §3 — Repository Pattern & Data Mapper
 */
@Entity('event_categories')
export class EventCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => Event, (event) => event.category)
  events!: Event[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
