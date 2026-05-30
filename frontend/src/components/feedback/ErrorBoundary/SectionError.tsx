import { Card } from '../../primitives/Card';
import { Button } from '../../primitives/Button';
import type { ErrorFallbackProps } from './types';

interface SectionErrorProps extends Pick<ErrorFallbackProps, 'reset' | 'traceId' | 'clientDebugId'> {
  message?: string;
}

/** Default fallback for a suspended section: a message, a retry, and support ids. */
export function SectionError({ reset, traceId, clientDebugId, message = 'Something went wrong.' }: SectionErrorProps) {
  return (
    <Card className="text-center">
      <p className="text-sm text-red-600">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={reset}>
        Try again
      </Button>
      <p className="mt-3 text-xs text-gray-400">
        {traceId ? <>Trace: {traceId} · </> : null}Debug: {clientDebugId}
      </p>
    </Card>
  );
}
