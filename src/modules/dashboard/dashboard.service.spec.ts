import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';

import { DashboardService } from './dashboard.service.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderStatus } from '../../common/enums/order-status.enum.js';
import { MinioService } from '../../infrastructures/minio/minio.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let ordersRepository: Record<string, jest.Mock>;
  let cacheManager: Record<string, jest.Mock>;
  let minioService: Record<string, jest.Mock>;

  beforeEach(async () => {
    ordersRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    minioService = {
      ensureBucketExists: jest.fn().mockResolvedValue(undefined),
      uploadFile: jest.fn().mockResolvedValue('exports/test.xlsx'),
      getFileUrl: jest
        .fn()
        .mockResolvedValue('https://minio.local/reports/test.xlsx'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Order),
          useValue: ordersRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: MinioService,
          useValue: minioService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getSalesSummary ──────────────────────────────────────

  describe('getSalesSummary', () => {
    const dto = { startDate: '2026-01-01', endDate: '2026-01-31' };

    it('should return cached result if available', async () => {
      const cached = {
        totalOrders: 5,
        totalRevenue: 1000,
        totalTicketsSold: 10,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getSalesSummary(dto);

      expect(result).toEqual(cached);
      expect(ordersRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should query DB and cache result if not cached', async () => {
      cacheManager.get.mockResolvedValue(null);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalOrders: '5',
          totalRevenue: '500000.00',
          totalTicketsSold: '10',
        }),
      };
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSalesSummary(dto);

      expect(result.totalOrders).toBe(5);
      expect(result.totalRevenue).toBe(500000);
      expect(result.totalTicketsSold).toBe(10);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw BadRequestException if startDate > endDate', async () => {
      const invalidDto = { startDate: '2026-02-01', endDate: '2026-01-01' };
      await expect(service.getSalesSummary(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── getTopEvents ─────────────────────────────────────────

  describe('getTopEvents', () => {
    const dto = { startDate: '2026-01-01', endDate: '2026-01-31', limit: 5 };

    it('should return cached result if available', async () => {
      const cached = [
        {
          rank: 1,
          id: 'e1',
          name: 'Event 1',
          totalRevenue: 1000,
          totalOrders: 5,
        },
      ];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getTopEvents(dto);

      expect(result).toEqual(cached);
      expect(ordersRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should query DB and return ranked events', async () => {
      cacheManager.get.mockResolvedValue(null);

      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 'e1',
            name: 'Concert A',
            totalRevenue: '2000000',
            totalOrders: '10',
          },
          {
            id: 'e2',
            name: 'Concert B',
            totalRevenue: '1000000',
            totalOrders: '5',
          },
        ]),
      };
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTopEvents(dto);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].name).toBe('Concert A');
      expect(result[0].totalRevenue).toBe(2000000);
      expect(result[1].rank).toBe(2);
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  // ─── getTopCategories ─────────────────────────────────────

  describe('getTopCategories', () => {
    const dto = { startDate: '2026-01-01', endDate: '2026-01-31', limit: 5 };

    it('should return cached result if available', async () => {
      const cached = [
        {
          rank: 1,
          id: 'c1',
          name: 'Konser',
          totalRevenue: 5000,
          totalOrders: 20,
        },
      ];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getTopCategories(dto);

      expect(result).toEqual(cached);
    });

    it('should query DB and return ranked categories', async () => {
      cacheManager.get.mockResolvedValue(null);

      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            name: 'Konser',
            totalRevenue: '3000000',
            totalOrders: '15',
          },
        ]),
      };
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTopCategories(dto);

      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
      expect(result[0].name).toBe('Konser');
      expect(result[0].totalRevenue).toBe(3000000);
    });
  });

  // ─── exportReport ─────────────────────────────────────────

  describe('exportReport', () => {
    const dto = { startDate: '2026-01-01', endDate: '2026-01-31' };

    it('should export report and return download URL', async () => {
      ordersRepository.find.mockResolvedValue([
        {
          id: 'order-1',
          createdAt: new Date('2026-01-15'),
          totalAmount: 100000,
          quantity: 2,
          status: OrderStatus.PAID,
          event: { title: 'Concert A' },
          user: { name: 'John', email: 'john@test.com' },
        },
      ]);

      const result = await service.exportReport(dto);

      expect(result.downloadUrl).toContain('minio');
      expect(result.fileName).toContain('sales-report');
      expect(result.generatedAt).toBeDefined();
      expect(minioService.uploadFile).toHaveBeenCalledWith(
        'reports',
        expect.stringContaining('exports/'),
        expect.any(Buffer),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(minioService.getFileUrl).toHaveBeenCalled();
    });

    it('should handle empty orders', async () => {
      ordersRepository.find.mockResolvedValue([]);

      const result = await service.exportReport(dto);

      expect(result.downloadUrl).toBeDefined();
      expect(minioService.uploadFile).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid date range', async () => {
      const invalidDto = { startDate: '2026-02-01', endDate: '2026-01-01' };
      await expect(service.exportReport(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
