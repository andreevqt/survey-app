import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../errors';
import type { PollContext } from './polls';

/** Owner reads `/polls/{id}/analytics`; admin reads `/admin/polls/{id}/analytics`. */
export function analyticsQueryOptions(id: string, context: PollContext = 'owner') {
  const isAdmin = context === 'admin';
  return queryOptions({
    queryKey: isAdmin ? ['admin', 'polls', id, 'analytics'] : ['polls', id, 'analytics'],
    queryFn: async () =>
      unwrap(
        isAdmin
          ? await apiClient.GET('/admin/polls/{id}/analytics', { params: { path: { id } } })
          : await apiClient.GET('/polls/{id}/analytics', { params: { path: { id } } }),
      ),
  });
}

export function useAnalyticsSuspense(id: string, context: PollContext = 'owner') {
  return useSuspenseQuery(analyticsQueryOptions(id, context));
}
