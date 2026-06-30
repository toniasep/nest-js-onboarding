import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.v1.controller';
import { UsersService } from '../../services/v1/users.v1.service';
import {
  User,
  Role,
} from '../../../../infrastructures/databases/entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<Partial<UsersService>>;

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
    usersService = {
      findById: jest.fn(),
      updateRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return the current user profile', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockUser);

      const { password: _pw, ...expected } = mockUser;
      expect(result).toEqual(expected);
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      usersService.updateRole!.mockResolvedValue(updatedUser);

      const result = await controller.updateRole(mockUser.id, {
        role: Role.ADMIN,
      });

      const { password: _pw, ...expected } = updatedUser;
      expect(result).toEqual(expected);
      expect(usersService.updateRole).toHaveBeenCalledWith(
        mockUser.id,
        Role.ADMIN,
      );
    });
  });
});
