import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Spinner } from '../../../../components/primitives/Spinner';
import { AnalyticsView } from '../../../../components/analytics/AnalyticsView';
import { ErrorBoundary, SectionError } from '../../../../components/feedback/ErrorBoundary';
import { useAnalyticsModal } from './hooks/useAnalyticsModal';
import type { AnalyticsModalContext, AnalyticsModalProps } from './types';

export function AnalyticsModal({ id, context = 'owner' }: AnalyticsModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Analytics"
      footer={
        <>
          <Button variant="secondary" onClick={() => toast.message('Export CSV — coming soon')}>Export CSV</Button>
          <Button onClick={close}>Done</Button>
        </>
      }
    >
      <ErrorBoundary
        resetKeys={[id, context]}
        fallback={(p) => <SectionError {...p} message="Could not load analytics." />}
      >
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner size={28} /></div>}>
          <AnalyticsModalContent id={id} context={context} />
        </Suspense>
      </ErrorBoundary>
    </Modal>
  );
}

function AnalyticsModalContent({ id, context }: { id: string; context: AnalyticsModalContext }) {
  const { analytics, poll } = useAnalyticsModal(id, context);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        For <b className="text-gray-900">{poll.title}</b> · /{poll.slug} · {analytics.totalResponses} responses
      </p>
      <AnalyticsView analytics={analytics} />
    </div>
  );
}
