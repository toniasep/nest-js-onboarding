import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'GET',
      url: '/test',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  it('should handle HttpException with string response', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [{ key: 'message', value: 'Not Found' }],
    });
  });

  it('should handle HttpException with message string in object', () => {
    const exception = new NotFoundException('User not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [{ key: 'message', value: 'User not found' }],
    });
  });

  it('should handle HttpException with validation errors (array of messages)', () => {
    const exception = new BadRequestException([
      'name should not be empty',
      'email must be an email',
    ]);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [
        { key: 'name', value: 'name should not be empty' },
        { key: 'email', value: 'email must be an email' },
      ],
    });
  });

  it('should handle EntityNotFoundError', () => {
    const error = new Error('Entity not found');
    Object.defineProperty(error, 'constructor', {
      value: { name: 'EntityNotFoundError' },
    });
    // Simulate the constructor name
    Object.setPrototypeOf(
      error,
      Object.create(Error.prototype, {
        constructor: { value: { name: 'EntityNotFoundError' } },
      }),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [{ key: 'entity', value: 'Resource not found' }],
    });
  });

  it('should handle generic Error with 500 status', () => {
    const error = new Error('Something broke');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [{ key: 'server', value: 'Internal server error' }],
    });
  });

  it('should handle unknown (non-Error) exceptions', () => {
    filter.catch('string error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      errors: [{ key: 'server', value: 'An unexpected error occurred' }],
    });
  });
});
