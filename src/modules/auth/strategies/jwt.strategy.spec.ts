import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    strategy = new JwtStrategy(configService as ConfigService);
  });

  describe('validate', () => {
    it('should return user object from JWT payload', () => {
      const payload = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'USER',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    });
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not set', () => {
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new JwtStrategy(emptyConfigService as unknown as ConfigService);
      }).toThrow('JWT_SECRET environment variable is not set');
    });
  });
});
