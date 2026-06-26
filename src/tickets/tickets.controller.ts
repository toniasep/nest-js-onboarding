import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { TicketsService } from './tickets.service.js';
import { VerifyTicketDto } from './dto/verify-ticket.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { SkipResponseTransform } from '../common/decorators/skip-response-transform.decorator.js';
import { Role } from '../users/entities/user.entity.js';

/**
 * TicketsController
 *
 * Handles HTTP routing untuk tiket endpoints.
 * Semua endpoints memerlukan JWT authentication.
 *
 * Referensi: rules.md §1 — Controllers hanya handle HTTP routing
 * Referensi: rules.md §2 — RESTful API Standardization
 */
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * GET /tickets — List semua tiket milik current user
   */
  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.ticketsService.findAllByUser(req.user.id);
  }

  /**
   * GET /tickets/:id — Detail tiket
   */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.ticketsService.findOne(id, req.user.id);
  }

  /**
   * GET /tickets/:id/download — Download PDF tiket
   *
   * Stream PDF dari Minio langsung ke response.
   * Skip response transform karena response bukan JSON.
   */
  @Get(':id/download')
  @Public()
  @SkipResponseTransform()
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user?: { id: string } },
    @Res() res: Response,
  ) {
    const userId = req.user?.id; // Bisa undefined karena Public()
    const { stream, ticketCode } = await this.ticketsService.downloadTicketPdf(
      id,
      userId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${ticketCode}.pdf"`,
    });

    stream.pipe(res);
  }

  /**
   * POST /tickets/verify — Admin: Verify tiket (scan QR Code)
   */
  @Post('verify')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  verify(@Body() verifyTicketDto: VerifyTicketDto) {
    return this.ticketsService.verifyTicket(verifyTicketDto.ticketCode);
  }
}
