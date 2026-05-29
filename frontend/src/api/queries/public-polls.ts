import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../errors';

export function publicPollQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['public-poll', slug],
    queryFn: async () => unwrap(await apiClient.GET('/public/polls/{slug}', { params: { path: { slug } } })),
  });
}

export function usePublicPollSuspense(slug: string) {
  return useSuspenseQuery(publicPollQueryOptions(slug));
}
