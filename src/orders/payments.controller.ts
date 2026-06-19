import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  async handleXenditWebhook(@Headers('x-callback-token') callbackToken: string, @Body() body: any) {
    const expectedToken = this.configService.get<string>('XENDIT_WEBHOOK_TOKEN');
    if (expectedToken && callbackToken !== expectedToken) {
      throw new UnauthorizedException('Invalid callback token');
    }

    await this.ordersService.handleWebhook(body);
    return { success: true };
  }
}
