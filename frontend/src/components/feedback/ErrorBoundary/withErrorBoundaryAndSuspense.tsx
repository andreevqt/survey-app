import { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { SectionError } from './SectionError';
import type { BoundarySuspenseOptions, WithBoundary } from './types';

/**
 * Wraps a content component in the standard `ErrorBoundary` + `Suspense` pair, with a
 * default `SectionError` fallback. Use when the same wrapper would otherwise repeat across
 * several sections (rule 7).
 */
export const withErrorBoundaryAndSuspense: WithBoundary = (Component, options: BoundarySuspenseOptions) => {
  const Wrapped = (props: React.ComponentProps<typeof Component>) => (
    <ErrorBoundary
      resetKeys={options.resetKeys}
      onError={options.onError}
      fallback={options.fallback ?? ((p) => <SectionError {...p} />)}
    >
      <Suspense fallback={options.skeleton}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundaryAndSuspense(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
};
