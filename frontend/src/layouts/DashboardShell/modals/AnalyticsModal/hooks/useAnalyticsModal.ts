import { useAnalyticsSuspense } from '../../../../../api/queries/analytics';
import { usePollSuspense } from '../../../../../api/queries/polls';
import type { AnalyticsModalContext } from '../types';

export function useAnalyticsModal(id: string, context: AnalyticsModalContext = 'owner') {
  const { data: analytics } = useAnalyticsSuspense(id, context);
  const { data: poll } = usePollSuspense(id, context);

  return { analytics, poll };
}
