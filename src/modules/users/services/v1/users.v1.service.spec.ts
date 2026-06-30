import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.v1.service';
import { UserRepository } from '../../repositories/v1/users.v1.repository';
import {
  User,
  Role,
} from '../../../../infrastructures/databases/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Partial<UserRepository>>;

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
    userRepository = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepository },
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
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should return null when user not found', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  // ─── findByEmailWithPassword ────────────────────────────────

  describe('findByEmailWithPassword', () => {
    it('should return user with password', async () => {
      (userRepository.findByEmailWithPassword as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should return null when user not found', async () => {
      (userRepository.findByEmailWithPassword as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.findByEmailWithPassword(
        'notfound@example.com',
      );

      expect(result).toBeNull();
    });
  });

  // ─── findById ───────────────────────────────────────────────

  describe('findById', () => {
    it('should return a user when found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

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

      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(createData);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(createData);
    });
  });

  // ─── updateRole ─────────────────────────────────────────────

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser });
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateRole(mockUser.id, Role.ADMIN);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRole('nonexistent-id', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
