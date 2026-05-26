import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function usePollAnalytics(pollId: string | undefined) {
  return useQuery({
    enabled: !!pollId,
    queryKey: ['polls', pollId, 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/polls/{id}/analytics', { params: { path: { id: pollId! } } });
      if (!r.response.ok) throw r.error ?? new Error('Could not load analytics');
      return r.data!;
    },
  });
}
