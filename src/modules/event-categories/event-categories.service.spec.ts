import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventCategoriesService } from './event-categories.service';
import { EventCategory } from './entities/event-category.entity';

describe('EventCategoriesService', () => {
  let service: EventCategoriesService;
  let categoryRepository: jest.Mocked<Partial<Repository<EventCategory>>>;

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
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCategoriesService,
        {
          provide: getRepositoryToken(EventCategory),
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
      categoryRepository.create!.mockReturnValue(mockCategory);
      categoryRepository.save!.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(categoryRepository.create).toHaveBeenCalledWith(createDto);
      expect(categoryRepository.save).toHaveBeenCalledWith(mockCategory);
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
      categoryRepository.findAndCount!.mockResolvedValue([[mockCategory], 1]);

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
      categoryRepository.findAndCount!.mockResolvedValue([[mockCategory], 1]);

      await service.findAll(listDto as any);

      expect(categoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.anything(),
          }),
        }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a category when found', async () => {
      categoryRepository.findOne!.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-uuid-1');

      expect(result).toEqual(mockCategory);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-uuid-1' },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

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

      categoryRepository.findOne!.mockResolvedValue({ ...mockCategory });
      categoryRepository.save!.mockResolvedValue(updatedCategory);

      const result = await service.update('cat-uuid-1', updateDto);

      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove a category', async () => {
      categoryRepository.findOne!.mockResolvedValue(mockCategory);
      categoryRepository.remove!.mockResolvedValue(mockCategory);

      await service.remove('cat-uuid-1');

      expect(categoryRepository.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
