import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventsController } from './events.v1.controller';
import { EventsService } from '../../services/v1/events.v1.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<Partial<EventsService>>;

  const mockEvent = {
    id: 'event-uuid-1',
    title: 'Concert Jakarta',
    description: 'A big concert',
    location: 'Jakarta',
    eventDate: new Date(),
    price: 100000,
    quota: 500,
    isPublished: false,
    categoryId: 'cat-uuid-1',
  };

  const mockPaginatedResult = {
    data: [mockEvent],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    eventsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      togglePublish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createDto = {
        title: 'Concert Jakarta',
        description: 'A big concert',
        location: 'Jakarta',
        eventDate: new Date(),
        price: 100000,
        quota: 500,
        categoryId: 'cat-uuid-1',
      };
      eventsService.create!.mockResolvedValue(mockEvent as any);

      const result = await controller.create(createDto as any);

      expect(result).toEqual(mockEvent);
      expect(eventsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated public events with isPublic = true', async () => {
      const listDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };
      eventsService.findAll!.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(listDto as any);

      expect(result).toEqual(mockPaginatedResult);
      expect(eventsService.findAll).toHaveBeenCalledWith(listDto, true);
    });
  });

  describe('findAllAdmin', () => {
    it('should return paginated events with isPublic = false', async () => {
      const listDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };
      eventsService.findAll!.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAllAdmin(listDto as any);

      expect(result).toEqual(mockPaginatedResult);
      expect(eventsService.findAll).toHaveBeenCalledWith(listDto, false);
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      eventsService.findOne!.mockResolvedValue(mockEvent as any);

      const result = await controller.findOne('event-uuid-1');

      expect(result).toEqual(mockEvent);
      expect(eventsService.findOne).toHaveBeenCalledWith('event-uuid-1');
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const updateDto = { title: 'Updated Concert' };
      const updatedEvent = { ...mockEvent, ...updateDto };
      eventsService.update!.mockResolvedValue(updatedEvent as any);

      const result = await controller.update('event-uuid-1', updateDto);

      expect(result).toEqual(updatedEvent);
      expect(eventsService.update).toHaveBeenCalledWith(
        'event-uuid-1',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove an event', async () => {
      eventsService.remove!.mockResolvedValue(undefined);

      await controller.remove('event-uuid-1');

      expect(eventsService.remove).toHaveBeenCalledWith('event-uuid-1');
    });
  });

  describe('togglePublish', () => {
    it('should toggle publish status', async () => {
      const toggled = { ...mockEvent, isPublished: true };
      eventsService.togglePublish!.mockResolvedValue(toggled as any);

      const result = await controller.togglePublish('event-uuid-1');

      expect(result).toEqual(toggled);
      expect(eventsService.togglePublish).toHaveBeenCalledWith('event-uuid-1');
    });
  });
});
