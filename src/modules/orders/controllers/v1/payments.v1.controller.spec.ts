import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.v1.controller';
import { OrdersService } from '../../services/v1/orders.v1.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let ordersService: jest.Mocked<Partial<OrdersService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    ordersService = {
      handleWebhook: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('valid-callback-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleXenditWebhook', () => {
    it('should process webhook when callback token is valid', async () => {
      const body = { external_id: 'order-1', status: 'PAID' };
      ordersService.handleWebhook!.mockResolvedValue(undefined);

      const result = await controller.handleXenditWebhook(
        'valid-callback-token',
        body,
      );

      expect(result).toEqual({ success: true });
      expect(ordersService.handleWebhook).toHaveBeenCalledWith(body);
    });

    it('should throw UnauthorizedException when callback token is invalid', async () => {
      const body = { external_id: 'order-1', status: 'PAID' };

      await expect(
        controller.handleXenditWebhook('invalid-token', body),
      ).rejects.toThrow(UnauthorizedException);

      expect(ordersService.handleWebhook).not.toHaveBeenCalled();
    });

    it('should process webhook when no expected token configured', async () => {
      configService.get!.mockReturnValue(undefined);
      const body = { external_id: 'order-1', status: 'PAID' };
      ordersService.handleWebhook!.mockResolvedValue(undefined);

      const result = await controller.handleXenditWebhook('any-token', body);

      expect(result).toEqual({ success: true });
      expect(ordersService.handleWebhook).toHaveBeenCalledWith(body);
    });
  });
});
