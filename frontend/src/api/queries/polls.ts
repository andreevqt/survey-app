import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../errors';

export type PollContext = 'owner' | 'admin';

export function myPollsQueryOptions(args: { page?: number; pageSize?: number } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return queryOptions({
    queryKey: ['polls', { page, pageSize }],
    queryFn: async () =>
      unwrap(
        await apiClient.GET('/polls', {
          params: { query: { page: String(page), pageSize: String(pageSize) } } as any,
        }),
      ),
  });
}

export function useMyPolls(args: { page?: number; pageSize?: number } = {}) {
  return useQuery(myPollsQueryOptions(args));
}

export function useMyPollsSuspense(args: { page?: number; pageSize?: number } = {}) {
  return useSuspenseQuery(myPollsQueryOptions(args));
}

/** Owner reads `/polls/{id}`; admin reads `/admin/polls/{id}` — one set of options either way. */
export function pollQueryOptions(id: string, context: PollContext = 'owner') {
  const isAdmin = context === 'admin';
  return queryOptions({
    queryKey: isAdmin ? ['admin', 'polls', id] : ['polls', id],
    queryFn: async () =>
      unwrap(
        isAdmin
          ? await apiClient.GET('/admin/polls/{id}', { params: { path: { id } } })
          : await apiClient.GET('/polls/{id}', { params: { path: { id } } }),
      ),
  });
}

export function usePoll(id: string | undefined) {
  return useQuery({ ...pollQueryOptions(id ?? ''), enabled: !!id });
}

export function usePollSuspense(id: string, context: PollContext = 'owner') {
  return useSuspenseQuery(pollQueryOptions(id, context));
}
