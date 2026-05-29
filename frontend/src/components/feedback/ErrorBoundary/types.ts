import type { ComponentType, ReactNode } from 'react';
import type { ErrorInfo } from 'react';

/** Props handed to a section's fallback renderer when a child throws. */
export interface ErrorFallbackProps {
  /** Retry: soft-resets the query cache on expected errors, hard-reloads on unexpected ones. */
  reset: () => void;
  /** The thrown error (an ApiError for failed API calls). */
  error: Error;
  /** Server-side trace id, when the response carried one. */
  traceId?: string;
  /** Client-generated id minted per caught error, for support correlation. */
  clientDebugId: string;
}

export interface ErrorBoundaryProps {
  fallback: (props: ErrorFallbackProps) => ReactNode;
  /** Changing any value resets the boundary (e.g. route/id changes). */
  resetKeys?: unknown[];
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

/** Options for {@link withErrorBoundaryAndSuspense}. */
export interface BoundarySuspenseOptions {
  /** Skeleton shown by Suspense while the child loads. */
  skeleton: ReactNode;
  /** Defaults to the shared SectionError fallback. */
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  resetKeys?: unknown[];
  onError?: ErrorBoundaryProps['onError'];
}

export type WithBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: BoundarySuspenseOptions,
) => ComponentType<P>;
