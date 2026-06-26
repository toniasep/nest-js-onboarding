import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { User, Role } from '../users/entities/user.entity.js';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

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
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Register Tests ─────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(
        '$2b$10$hashedpassword',
      );
      usersService.create!.mockResolvedValue(mockUser);

      const result = await authService.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
        accessToken: 'mock-jwt-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  // ─── Login Tests ────────────────────────────────────────────

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginDto);

      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
        accessToken: 'mock-jwt-token',
      });
    });

    it('should throw UnauthorizedException if email not found', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── Token Generation Tests ─────────────────────────────────

  describe('token generation', () => {
    it('should include correct payload in JWT token', async () => {
      usersService.findByEmailWithPassword!.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });
});
