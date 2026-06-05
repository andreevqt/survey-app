import { useAnalyticsSuspense } from '../../../../api/queries/analytics';
import { usePollSuspense } from '../../../../api/queries/polls';
import type { AnalyticsPageContext } from '../types';

export function useAnalyticsPage(id: string, context: AnalyticsPageContext = 'owner') {
  const { data: analytics } = useAnalyticsSuspense(id, context);
  const { data: poll } = usePollSuspense(id, context);

  return { analytics, poll };
}
