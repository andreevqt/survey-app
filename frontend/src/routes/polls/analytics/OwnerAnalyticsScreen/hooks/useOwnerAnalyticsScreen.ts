import { useParams } from 'react-router-dom';
import { usePollAnalytics } from '../../../../../api/queries/analytics';
import type { AnalyticsResponse } from '../types';

export interface OwnerAnalyticsScreenViewModel {
  status: 'loading' | 'error' | 'ready';
  data?: AnalyticsResponse;
}

export function useOwnerAnalyticsScreen(): OwnerAnalyticsScreenViewModel {
  const { id } = useParams<{ id: string }>();
  const q = usePollAnalytics(id);

  if (q.isLoading) return { status: 'loading' };
  if (q.isError || !q.data) return { status: 'error' };
  return { status: 'ready', data: q.data };
}
