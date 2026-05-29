import { useRef } from 'react';
import type { ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ApiError } from '../../../api/errors';
import type { ErrorBoundaryProps } from './types';

function newDebugId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `dbg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Network/fetch failures and API errors are expected and safely retryable. */
function isExpectedError(error: Error): boolean {
  if (error instanceof ApiError) return true;
  // openapi-fetch rejects with a TypeError ("Failed to fetch") on network failure.
  return error instanceof TypeError || /fetch|network/i.test(error.message);
}

/** Single choke-point for error reporting — wire a logging endpoint here later. */
function logError(payload: { clientDebugId: string; traceId?: string; error: Error; info?: ErrorInfo }) {
  // eslint-disable-next-line no-console
  console.error('[ErrorBoundary]', payload.clientDebugId, payload.traceId ?? '(no trace)', payload.error, payload.info);
}

/**
 * Shared boundary for suspense-loaded sections. Wraps react-query's
 * `QueryErrorResetBoundary` around react-error-boundary so a retry can re-run the
 * underlying suspense query. Mints a `clientDebugId` per caught error and forwards
 * `{ reset, error, traceId, clientDebugId }` to a typed fallback.
 */
export function ErrorBoundary({ fallback, resetKeys, onError, children }: ErrorBoundaryProps) {
  const debugIdRef = useRef<string | null>(null);

  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQuery }) => (
        <ReactErrorBoundary
          resetKeys={resetKeys}
          onReset={() => {
            debugIdRef.current = null;
            resetQuery();
          }}
          onError={(thrown, info) => {
            const error: Error = thrown instanceof Error ? thrown : new Error(String(thrown));
            debugIdRef.current = newDebugId();
            const traceId = error instanceof ApiError ? error.traceId : undefined;
            logError({ clientDebugId: debugIdRef.current, traceId, error, info });
            onError?.(error, info);
          }}
          fallbackRender={({ error: thrown, resetErrorBoundary }) => {
            const error: Error = thrown instanceof Error ? thrown : new Error(String(thrown));
            const clientDebugId = debugIdRef.current ?? (debugIdRef.current = newDebugId());
            const traceId = error instanceof ApiError ? error.traceId : undefined;
            const reset = () => {
              if (isExpectedError(error)) {
                resetQuery();
                resetErrorBoundary();
              } else {
                window.location.reload();
              }
            };
            return fallback({ reset, error, traceId, clientDebugId });
          }}
        >
          {children}
        </ReactErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
