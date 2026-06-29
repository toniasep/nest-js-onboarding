import { IsUUID } from 'class-validator';

/**
 * DTO untuk verifikasi tiket oleh Admin.
 * Digunakan di endpoint POST /tickets/verify.
 *
 * Referensi: rules.md §1 — Validation Pipe + DTO
 */
export class VerifyTicketDto {
  @IsUUID()
  ticketCode!: string;
}
