import { Suspense } from 'react';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { Spinner } from '../../../components/primitives/Spinner';
import { ErrorBoundary } from '../../../components/feedback/ErrorBoundary';
import type { ErrorFallbackProps } from '../../../components/feedback/ErrorBoundary';
import { ApiError } from '../../../api/errors';
import { QuestionRenderer } from '../QuestionRenderer';
import { usePollScreen } from './hooks/usePollScreen';

export function PollScreen() {
  return (
    <ErrorBoundary fallback={(p) => <PollScreenError {...p} />}>
      <Suspense fallback={<div className="flex justify-center py-16"><Spinner size={28} /></div>}>
        <PollScreenContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function PollScreenError({ reset, error, traceId, clientDebugId }: ErrorFallbackProps) {
  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <Card className="max-w-md mx-auto mt-16 text-center">
      <p className="text-base font-semibold text-gray-900">
        {notFound ? 'Poll not found' : 'Could not load this poll'}
      </p>
      {!notFound && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={reset}>
          Try again
        </Button>
      )}
      <p className="mt-3 text-xs text-gray-400">
        {traceId ? <>Trace: {traceId} · </> : null}Debug: {clientDebugId}
      </p>
    </Card>
  );
}

function PollScreenContent() {
  const vm = usePollScreen();

  if (vm.status === 'closed') {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-3xl">🔒</p>
        <p className="mt-3 text-base font-semibold text-gray-900">This poll has closed</p>
        <p className="mt-1 text-sm text-gray-500">No new responses are being accepted.</p>
      </Card>
    );
  }

  if (vm.status === 'submitted') {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-3 text-base font-semibold text-gray-900">Thank you!</p>
        <p className="mt-1 text-sm text-gray-500">Your response has been recorded.</p>
      </Card>
    );
  }

  return (
    <section className="max-w-xl mx-auto py-12 px-6">
      <Card>
        <h1 className="text-2xl font-bold text-gray-900">{vm.poll.title}</h1>
        {vm.poll.description && (
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{vm.poll.description}</p>
        )}
        <form onSubmit={vm.onSubmit} className="mt-6 flex flex-col gap-6">
          {vm.poll.questions.map((qn) => (
            <QuestionRenderer
              key={qn.id}
              question={qn}
              value={vm.values[qn.id]}
              onChange={(v) => vm.onChangeValue(qn.id, v)}
              error={vm.errors[qn.id]}
            />
          ))}
          <Button type="submit" isLoading={vm.isSubmitting} className="w-full">
            Submit response
          </Button>
        </form>
      </Card>
    </section>
  );
}
