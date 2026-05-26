import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let payload: ErrorPayload;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as { code?: string; message?: string | string[]; details?: unknown };
        payload = {
          statusCode: status,
          code: b.code ?? defaultCode(status),
          message: Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? exception.message),
          details: b.details,
        };
      } else {
        payload = { statusCode: status, code: defaultCode(status), message: String(body) };
      }
    } else {
      this.logger.error(exception);
      payload = { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL', message: 'Internal server error' };
    }
    res.status(payload.statusCode).json(payload);
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_FAILED';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    default: return 'INTERNAL';
  }
}
