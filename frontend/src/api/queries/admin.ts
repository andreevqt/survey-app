import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../errors';

export function adminUsersQueryOptions(args: { page?: number; pageSize?: number } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return queryOptions({
    queryKey: ['admin', 'users', { page, pageSize }],
    queryFn: async () =>
      unwrap(await apiClient.GET('/admin/users', { params: { query: { page, pageSize } } as any })),
  });
}

export function useAdminUsers(args: { page?: number; pageSize?: number; enabled?: boolean } = {}) {
  return useQuery({ ...adminUsersQueryOptions(args), enabled: args.enabled ?? true });
}

export function useAdminUsersSuspense(args: { page?: number; pageSize?: number } = {}) {
  return useSuspenseQuery(adminUsersQueryOptions(args));
}

export function adminPollsQueryOptions(args: { page?: number; pageSize?: number } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return queryOptions({
    queryKey: ['admin', 'polls', { page, pageSize }],
    queryFn: async () =>
      unwrap(await apiClient.GET('/admin/polls', { params: { query: { page, pageSize } } as any })),
  });
}

export function useAdminPolls(args: { page?: number; pageSize?: number; enabled?: boolean } = {}) {
  return useQuery({ ...adminPollsQueryOptions(args), enabled: args.enabled ?? true });
}

export function useAdminPollsSuspense(args: { page?: number; pageSize?: number } = {}) {
  return useSuspenseQuery(adminPollsQueryOptions(args));
}

export function useSystemAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => unwrap(await apiClient.GET('/admin/analytics')),
  });
}
