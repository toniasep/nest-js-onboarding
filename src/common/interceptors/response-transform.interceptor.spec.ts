import { of, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ResponseTransformInterceptor } from './response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    interceptor = new ResponseTransformInterceptor(reflector);
  });

  const createMockExecutionContext = () => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should wrap response data in { data: ... } format', (done) => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext();
    const callHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({ data: { id: 1, name: 'test' } });
      done();
    });
  });

  it('should wrap array response in { data: [...] } format', (done) => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext();
    const callHandler = {
      handle: () => of([{ id: 1 }, { id: 2 }]),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }] });
      done();
    });
  });

  it('should skip transform when @SkipResponseTransform() is set', (done) => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockExecutionContext();
    const rawResponse = { success: true };
    const callHandler = {
      handle: () => of(rawResponse),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({ success: true });
      done();
    });
  });
});
