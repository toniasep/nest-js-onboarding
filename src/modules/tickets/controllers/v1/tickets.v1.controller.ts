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
import { TicketsService } from '../../services/v1/tickets.v1.service.js';
import { VerifyTicketDto } from '../../dtos/requests/v1/verify-ticket.dto.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';
import { Roles } from '../../../../shared/decorators/roles.decorator.js';
import { Public } from '../../../../shared/decorators/public.decorator.js';
import { SkipResponseTransform } from '../../../../shared/decorators/skip-response-transform.decorator.js';
import { Role } from '../../../../infrastructures/databases/entities/user.entity.js';
import { TicketResponseDto } from '../../dtos/responses/v1/ticket-response.dto.js';

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
  async findAll(
    @Request() req: { user: { id: string } },
  ): Promise<TicketResponseDto[]> {
    const data = await this.ticketsService.findAllByUser(req.user.id);
    return TicketResponseDto.MapEntities(data);
  }

  /**
   * GET /tickets/:id — Detail tiket
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ): Promise<TicketResponseDto> {
    const data = await this.ticketsService.findOne(id, req.user.id);
    return TicketResponseDto.MapEntity(data);
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
  async verify(
    @Body() verifyTicketDto: VerifyTicketDto,
  ): Promise<TicketResponseDto> {
    const data = await this.ticketsService.verifyTicket(
      verifyTicketDto.ticketCode,
    );
    return TicketResponseDto.MapEntity(data);
  }
}
