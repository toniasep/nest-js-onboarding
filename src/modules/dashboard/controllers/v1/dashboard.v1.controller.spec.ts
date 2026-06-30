import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.v1.controller.js';
import { DashboardService } from '../../services/v1/dashboard.v1.service.js';
import { JwtAuthGuard } from '../../../../infrastructures/modules/jwt/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../infrastructures/modules/jwt/guards/roles.guard.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getSalesSummary: jest.fn(),
      getTopEvents: jest.fn(),
      getTopCategories: jest.fn(),
      exportReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSales', () => {
    it('should return sales summary', async () => {
      const dto = { startDate: '2026-01-01', endDate: '2026-01-31' };
      const expectedResult = {
        totalOrders: 10,
        totalRevenue: 1000,
        totalTicketsSold: 20,
        startDate: dto.startDate,
        endDate: dto.endDate,
      };

      service.getSalesSummary.mockResolvedValue(expectedResult);

      const result = await controller.getSales(dto);

      expect(result).toEqual(expectedResult);
      expect(service.getSalesSummary).toHaveBeenCalledWith(dto);
    });
  });

  describe('getTopEvents', () => {
    it('should return top events', async () => {
      const dto = { startDate: '2026-01-01', endDate: '2026-01-31', limit: 5 };
      const expectedResult = [
        {
          rank: 1,
          id: '1',
          name: 'Event A',
          totalRevenue: 1000,
          totalOrders: 10,
        },
      ];

      service.getTopEvents.mockResolvedValue(expectedResult);

      const result = await controller.getTopEvents(dto);

      expect(result).toEqual(expectedResult);
      expect(service.getTopEvents).toHaveBeenCalledWith(dto);
    });
  });

  describe('getTopCategories', () => {
    it('should return top categories', async () => {
      const dto = { startDate: '2026-01-01', endDate: '2026-01-31', limit: 5 };
      const expectedResult = [
        {
          rank: 1,
          id: '1',
          name: 'Category A',
          totalRevenue: 1000,
          totalOrders: 10,
        },
      ];

      service.getTopCategories.mockResolvedValue(expectedResult);

      const result = await controller.getTopCategories(dto);

      expect(result).toEqual(expectedResult);
      expect(service.getTopCategories).toHaveBeenCalledWith(dto);
    });
  });

  describe('exportReport', () => {
    it('should export report and return URL', async () => {
      const dto = { startDate: '2026-01-01', endDate: '2026-01-31' };
      const expectedResult = {
        downloadUrl: 'http://test/report.xlsx',
        fileName: 'report.xlsx',
        generatedAt: '2026-01-01T00:00:00.000Z',
      };

      service.exportReport.mockResolvedValue(expectedResult);

      const result = await controller.exportReport(dto);

      expect(result).toEqual(expectedResult);
      expect(service.exportReport).toHaveBeenCalledWith(dto);
    });
  });
});
