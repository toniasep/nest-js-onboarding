import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, Role } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Partial<Repository<User>>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findByEmail ────────────────────────────────────────────

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      userRepository.findOne!.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  // ─── findByEmailWithPassword ────────────────────────────────

  describe('findByEmailWithPassword', () => {
    it('should return user with password using QueryBuilder', async () => {
      const mockQb = userRepository.createQueryBuilder!('user');
      (mockQb as any).getOne.mockResolvedValue(mockUser);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQb.addSelect).toHaveBeenCalledWith('user.password');
      expect(mockQb.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'test@example.com',
      });
    });

    it('should return null when user not found', async () => {
      const mockQb = userRepository.createQueryBuilder!('user');
      (mockQb as any).getOne.mockResolvedValue(null);

      const result = await service.findByEmailWithPassword(
        'notfound@example.com',
      );

      expect(result).toBeNull();
    });
  });

  // ─── findById ───────────────────────────────────────────────

  describe('findById', () => {
    it('should return a user when found', async () => {
      userRepository.findOne!.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createData = {
        name: 'New User',
        email: 'new@example.com',
        password: '$2b$10$hashedpassword',
      };

      userRepository.create!.mockReturnValue(mockUser);
      userRepository.save!.mockResolvedValue(mockUser);

      const result = await service.create(createData);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(createData);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  // ─── updateRole ─────────────────────────────────────────────

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      userRepository.save!.mockResolvedValue(updatedUser);

      const result = await service.updateRole(mockUser.id, Role.ADMIN);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateRole('nonexistent-id', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
