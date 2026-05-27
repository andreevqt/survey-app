import { useSystemAnalytics } from '../../../../api/queries/admin';
import type { SystemAnalyticsResponse } from '../types';

export type AnalyticsTabStatus = 'loading' | 'error' | 'ready';

export interface AnalyticsTabViewModel {
  status: AnalyticsTabStatus;
  data?: SystemAnalyticsResponse;
}

export function useAnalyticsTab(): AnalyticsTabViewModel {
  const q = useSystemAnalytics();

  let status: AnalyticsTabStatus;
  if (q.isLoading) {
    status = 'loading';
  } else if (q.isError || !q.data) {
    status = 'error';
  } else {
    status = 'ready';
  }

  return { status, data: q.data };
}
