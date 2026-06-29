import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventCategoriesService } from '../event-categories/event-categories.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: jest.Mocked<Partial<Repository<Event>>>;
  let eventCategoriesService: jest.Mocked<Partial<EventCategoriesService>>;

  const mockCategory = {
    id: 'cat-uuid-1',
    name: 'Konser',
    description: 'Kategori konser',
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent: Event = {
    id: 'event-uuid-1',
    title: 'Concert Jakarta',
    description: 'A big concert',
    location: 'Jakarta',
    eventDate: new Date('2026-08-01T19:00:00Z'),
    price: 100000,
    quota: 500,
    isPublished: false,
    categoryId: 'cat-uuid-1',
    category: mockCategory,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    eventRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };

    eventCategoriesService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: eventRepository },
        {
          provide: EventCategoriesService,
          useValue: eventCategoriesService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────

  describe('create', () => {
    it('should validate category exists and create event', async () => {
      const createDto = {
        title: 'Concert Jakarta',
        description: 'A big concert',
        location: 'Jakarta',
        eventDate: new Date('2026-08-01T19:00:00Z'),
        price: 100000,
        quota: 500,
        categoryId: 'cat-uuid-1',
      };

      eventCategoriesService.findOne!.mockResolvedValue(mockCategory as any);
      eventRepository.create!.mockReturnValue(mockEvent);
      eventRepository.save!.mockResolvedValue(mockEvent);

      const result = await service.create(createDto as any);

      expect(result).toEqual(mockEvent);
      expect(eventCategoriesService.findOne).toHaveBeenCalledWith('cat-uuid-1');
      expect(eventRepository.create).toHaveBeenCalledWith(createDto);
      expect(eventRepository.save).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      eventCategoriesService.findOne!.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.create({ categoryId: 'nonexistent' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return event when found', async () => {
      eventRepository.findOne!.mockResolvedValue(mockEvent);

      const result = await service.findOne('event-uuid-1');

      expect(result).toEqual(mockEvent);
      expect(eventRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-uuid-1' },
        relations: { category: true },
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      eventRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('should update event fields', async () => {
      const updateDto = { title: 'Updated Concert' };
      const updatedEvent = { ...mockEvent, title: 'Updated Concert' };

      eventRepository.findOne!.mockResolvedValue({ ...mockEvent });
      eventRepository.save!.mockResolvedValue(updatedEvent);

      const result = await service.update('event-uuid-1', updateDto);

      expect(result).toEqual(updatedEvent);
    });

    it('should validate new category when categoryId changes', async () => {
      const updateDto = { categoryId: 'new-cat-uuid' };
      eventRepository.findOne!.mockResolvedValue({ ...mockEvent });
      eventCategoriesService.findOne!.mockResolvedValue(mockCategory as any);
      eventRepository.save!.mockResolvedValue({
        ...mockEvent,
        categoryId: 'new-cat-uuid',
      });

      await service.update('event-uuid-1', updateDto);

      expect(eventCategoriesService.findOne).toHaveBeenCalledWith(
        'new-cat-uuid',
      );
    });

    it('should not validate category when categoryId is unchanged', async () => {
      const updateDto = { title: 'Updated', categoryId: 'cat-uuid-1' };
      eventRepository.findOne!.mockResolvedValue({ ...mockEvent });
      eventRepository.save!.mockResolvedValue({
        ...mockEvent,
        title: 'Updated',
      });

      await service.update('event-uuid-1', updateDto);

      expect(eventCategoriesService.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── remove ─────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove event', async () => {
      eventRepository.findOne!.mockResolvedValue(mockEvent);
      eventRepository.remove!.mockResolvedValue(mockEvent);

      await service.remove('event-uuid-1');

      expect(eventRepository.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw NotFoundException when event not found', async () => {
      eventRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── togglePublish ──────────────────────────────────────────

  describe('togglePublish', () => {
    it('should toggle isPublished from false to true', async () => {
      const unpublished = { ...mockEvent, isPublished: false };
      const published = { ...mockEvent, isPublished: true };

      eventRepository.findOne!.mockResolvedValue(unpublished);
      eventRepository.save!.mockResolvedValue(published);

      const result = await service.togglePublish('event-uuid-1');

      expect(result.isPublished).toBe(true);
    });

    it('should toggle isPublished from true to false', async () => {
      const published = { ...mockEvent, isPublished: true };
      const unpublished = { ...mockEvent, isPublished: false };

      eventRepository.findOne!.mockResolvedValue(published);
      eventRepository.save!.mockResolvedValue(unpublished);

      const result = await service.togglePublish('event-uuid-1');

      expect(result.isPublished).toBe(false);
    });
  });
});
