import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockExecutionContext = (
    method: string = 'GET',
    url: string = '/test',
    statusCode: number = 200,
  ) => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ method, url }),
        getResponse: jest.fn().mockReturnValue({ statusCode }),
      }),
    } as any;
  };

  it('should log successful request with method, url, status, and duration', (done) => {
    const context = createMockExecutionContext('GET', '/events', 200);
    const callHandler = {
      handle: () => of({ data: 'test' }),
    };

    const logSpy = jest.spyOn((interceptor as any).logger, 'log');

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(logSpy).toHaveBeenCalled();
        const logMessage = logSpy.mock.calls[0][0];
        expect(logMessage).toContain('GET');
        expect(logMessage).toContain('/events');
        expect(logMessage).toContain('200');
        expect(logMessage).toMatch(/\d+ms/);
        done();
      },
    });
  });

  it('should log error request with method, url, and error message', (done) => {
    const context = createMockExecutionContext('POST', '/orders');
    const callHandler = {
      handle: () => throwError(() => new Error('Something went wrong')),
    };

    const errorSpy = jest.spyOn((interceptor as any).logger, 'error');

    interceptor.intercept(context, callHandler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalled();
        const logMessage = errorSpy.mock.calls[0][0];
        expect(logMessage).toContain('POST');
        expect(logMessage).toContain('/orders');
        expect(logMessage).toContain('ERROR');
        expect(logMessage).toContain('Something went wrong');
        done();
      },
    });
  });
});
