import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

// Mock the minio module
jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      presignedGetObject: jest.fn(),
      getObject: jest.fn(),
    })),
  };
});

describe('MinioService', () => {
  let service: MinioService;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let mockClient: any;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_USE_SSL: 'false',
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_BUCKET_TICKETS: 'tickets',
        };
        return config[key] ?? defaultValue;
      }),
    };

    service = new MinioService(configService as ConfigService);

    // Access the mocked client via the service's private property
    mockClient = (service as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── ensureBucketExists ─────────────────────────────────────

  describe('ensureBucketExists', () => {
    it('should create bucket if it does not exist', async () => {
      mockClient.bucketExists.mockResolvedValue(false);

      await service.ensureBucketExists('tickets');

      expect(mockClient.bucketExists).toHaveBeenCalledWith('tickets');
      expect(mockClient.makeBucket).toHaveBeenCalledWith('tickets');
    });

    it('should skip creation if bucket already exists', async () => {
      mockClient.bucketExists.mockResolvedValue(true);

      await service.ensureBucketExists('tickets');

      expect(mockClient.bucketExists).toHaveBeenCalledWith('tickets');
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  // ─── uploadFile ─────────────────────────────────────────────

  describe('uploadFile', () => {
    it('should upload file to minio and return object name', async () => {
      const buffer = Buffer.from('test content');
      mockClient.putObject.mockResolvedValue(undefined);

      const result = await service.uploadFile(
        'tickets',
        'qr/test.png',
        buffer,
        'image/png',
      );

      expect(result).toEqual('qr/test.png');
      expect(mockClient.putObject).toHaveBeenCalledWith(
        'tickets',
        'qr/test.png',
        buffer,
        buffer.length,
        { 'Content-Type': 'image/png' },
      );
    });
  });

  // ─── getFileUrl ─────────────────────────────────────────────

  describe('getFileUrl', () => {
    it('should return presigned URL', async () => {
      mockClient.presignedGetObject.mockResolvedValue(
        'http://localhost:9000/tickets/qr/test.png?token=xxx',
      );

      const result = await service.getFileUrl('tickets', 'qr/test.png');

      expect(result).toEqual(
        'http://localhost:9000/tickets/qr/test.png?token=xxx',
      );
      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'tickets',
        'qr/test.png',
        3600, // PRESIGNED_URL_EXPIRY default
      );
    });

    it('should use custom expiry when provided', async () => {
      mockClient.presignedGetObject.mockResolvedValue('http://...');

      await service.getFileUrl('tickets', 'qr/test.png', 7200);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'tickets',
        'qr/test.png',
        7200,
      );
    });
  });

  // ─── getFileStream ──────────────────────────────────────────

  describe('getFileStream', () => {
    it('should return readable stream', async () => {
      const mockStream = { pipe: jest.fn() };
      mockClient.getObject.mockResolvedValue(mockStream);

      const result = await service.getFileStream('tickets', 'pdf/test.pdf');

      expect(result).toEqual(mockStream);
      expect(mockClient.getObject).toHaveBeenCalledWith(
        'tickets',
        'pdf/test.pdf',
      );
    });
  });
});
