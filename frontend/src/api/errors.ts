/**
 * Uniform client-side error for failed API calls. Query functions throw this so the
 * shared ErrorBoundary can read a stable shape (status, code, optional traceId) instead
 * of the raw openapi-fetch error body.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly details?: unknown;

  constructor(args: { status: number; code: string; message: string; traceId?: string; details?: unknown }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.traceId = args.traceId;
    this.details = args.details;
  }
}

/** Shape of the backend error envelope (see HttpExceptionFilter). */
interface ErrorEnvelope {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
}

/** The relevant slice of an openapi-fetch result. */
interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Returns the response body on success, or throws an {@link ApiError} on a non-2xx response.
 * `traceId` is read from the `x-trace-id` response header when present (optional — the
 * backend does not emit one today, so it stays undefined and the fallback degrades gracefully).
 */
export function unwrap<T>(r: FetchResult<T>): T {
  if (r.response.ok && r.data !== undefined) return r.data;

  const envelope = (r.error ?? {}) as ErrorEnvelope;
  throw new ApiError({
    status: envelope.statusCode ?? r.response.status,
    code: envelope.code ?? 'UNKNOWN',
    message: envelope.message ?? 'Request failed',
    traceId: r.response.headers.get('x-trace-id') ?? undefined,
    details: envelope.details,
  });
}
