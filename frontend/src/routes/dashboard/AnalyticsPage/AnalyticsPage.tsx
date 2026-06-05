import { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { AnalyticsView } from '../../../components/analytics/AnalyticsView';
import { ErrorBoundary, SectionError } from '../../../components/feedback/ErrorBoundary';
import { useAnalyticsPage } from './hooks/useAnalyticsPage';
import type { AnalyticsPageContext, AnalyticsPageProps } from './types';

export function AnalyticsPage({ context = 'owner' }: AnalyticsPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  return (
    <div className="mt-8 px-8">
      <ErrorBoundary
        resetKeys={[id ?? '', context]}
        fallback={(p) => (
          <Card>
            <SectionError {...p} message="Could not load analytics." />
          </Card>
        )}
      >
        <Suspense fallback={<SectionSpinner />}>
          <AnalyticsPageContent id={id!} context={context} onClose={close} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function AnalyticsPageContent({
  id,
  context,
  onClose,
}: {
  id: string;
  context: AnalyticsPageContext;
  onClose: () => void;
}) {
  const { analytics, poll } = useAnalyticsPage(id, context);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        For <b className="text-gray-900">{poll.title}</b> · /{poll.slug} · {analytics.totalResponses} responses
      </p>
      <AnalyticsView analytics={analytics} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => toast.message('Export CSV — coming soon')}>Export CSV</Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
