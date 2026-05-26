import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  function makeHost(captured: any) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status(code: number) { captured.statusCode = code; return this; },
          json(body: any) { captured.body = body; return this; },
        }),
      }),
    } as unknown as ArgumentsHost;
  }

  it('emits the uniform error envelope for an HttpException with a code', () => {
    const captured: any = {};
    const filter = new HttpExceptionFilter();
    filter.catch(
      new HttpException({ code: 'POLL_CLOSED', message: 'closed' }, HttpStatus.FORBIDDEN),
      makeHost(captured),
    );
    expect(captured.statusCode).toBe(403);
    expect(captured.body).toMatchObject({
      statusCode: 403,
      code: 'POLL_CLOSED',
      message: 'closed',
    });
  });

  it('falls back to INTERNAL on a non-HttpException', () => {
    const captured: any = {};
    new HttpExceptionFilter().catch(new Error('boom'), makeHost(captured));
    expect(captured.statusCode).toBe(500);
    expect(captured.body.code).toBe('INTERNAL');
  });
});
