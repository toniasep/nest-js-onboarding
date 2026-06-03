import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Enum untuk role user
 */
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * User Entity
 *
 * Menyimpan data user termasuk credential dan role.
 * Password di-exclude dari default select untuk keamanan.
 *
 * Referensi: rules.md §3 — Repository Pattern & Data Mapper
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role!: Role;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
