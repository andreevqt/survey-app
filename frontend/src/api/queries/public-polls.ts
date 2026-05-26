import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function usePublicPoll(slug: string | undefined) {
  return useQuery({
    enabled: !!slug,
    queryKey: ['public-poll', slug],
    queryFn: async () => {
      const r = await apiClient.GET('/public/polls/{slug}', { params: { path: { slug: slug! } } });
      if (!r.response.ok) throw r.error ?? new Error('Not found');
      return r.data!;
    },
  });
}
