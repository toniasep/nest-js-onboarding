import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventCategoriesService } from './event-categories.v1.service';
import { EventCategoryRepository } from '../../repositories/v1/event-categories.v1.repository';
import { EventCategory } from '../../../../infrastructures/databases/entities/event-category.entity';

describe('EventCategoriesService', () => {
  let service: EventCategoriesService;
  let categoryRepository: jest.Mocked<Partial<EventCategoryRepository>>;

  const mockCategory: EventCategory = {
    id: 'cat-uuid-1',
    name: 'Konser',
    description: 'Kategori konser musik',
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    categoryRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCategoriesService,
        {
          provide: EventCategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<EventCategoriesService>(EventCategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────

  describe('create', () => {
    it('should create and save a new category', async () => {
      const createDto = {
        name: 'Konser',
        description: 'Kategori konser musik',
      };
      (categoryRepository.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(categoryRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  // ─── findAll ────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const listDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };
      const paginatedResult = {
        data: [mockCategory],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      (categoryRepository.findAll as jest.Mock).mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAll(listDto as any);

      expect(result.data).toEqual([mockCategory]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply search filter when provided', async () => {
      const listDto = {
        page: 1,
        limit: 10,
        search: 'Konser',
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };
      const paginatedResult = {
        data: [mockCategory],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      (categoryRepository.findAll as jest.Mock).mockResolvedValue(
        paginatedResult,
      );

      await service.findAll(listDto as any);

      expect(categoryRepository.findAll).toHaveBeenCalledWith(listDto);
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a category when found', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await service.findOne('cat-uuid-1');

      expect(result).toEqual(mockCategory);
      expect(categoryRepository.findById).toHaveBeenCalledWith('cat-uuid-1');
    });

    it('should throw NotFoundException when category not found', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('should update category fields', async () => {
      const updateDto = { name: 'Updated Konser' };
      const updatedCategory = { ...mockCategory, name: 'Updated Konser' };

      (categoryRepository.findById as jest.Mock).mockResolvedValue({
        ...mockCategory,
      });
      (categoryRepository.save as jest.Mock).mockResolvedValue(updatedCategory);

      const result = await service.update('cat-uuid-1', updateDto);

      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove a category', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (categoryRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove('cat-uuid-1');

      expect(categoryRepository.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
