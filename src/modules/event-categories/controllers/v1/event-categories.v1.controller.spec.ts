import { Test, TestingModule } from '@nestjs/testing';
import { EventCategoriesController } from './event-categories.v1.controller';
import { EventCategoriesService } from '../../services/v1/event-categories.v1.service';

describe('EventCategoriesController', () => {
  let controller: EventCategoriesController;
  let service: jest.Mocked<Partial<EventCategoriesService>>;

  const mockCategory = {
    id: 'cat-uuid-1',
    name: 'Konser',
    description: 'Kategori konser musik',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockCategory],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventCategoriesController],
      providers: [{ provide: EventCategoriesService, useValue: service }],
    }).compile();

    controller = module.get<EventCategoriesController>(
      EventCategoriesController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createDto = {
        name: 'Konser',
        description: 'Kategori konser musik',
      };
      service.create!.mockResolvedValue(mockCategory as any);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const listDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };
      service.findAll!.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(listDto as any);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(listDto);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      service.findOne!.mockResolvedValue(mockCategory as any);

      const result = await controller.findOne('cat-uuid-1');

      expect(result).toEqual(mockCategory);
      expect(service.findOne).toHaveBeenCalledWith('cat-uuid-1');
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto = { name: 'Updated Konser' };
      const updated = { ...mockCategory, ...updateDto };
      service.update!.mockResolvedValue(updated as any);

      const result = await controller.update('cat-uuid-1', updateDto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('cat-uuid-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      service.remove!.mockResolvedValue(undefined);

      await controller.remove('cat-uuid-1');

      expect(service.remove).toHaveBeenCalledWith('cat-uuid-1');
    });
  });
});
