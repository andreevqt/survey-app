import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useAdminUsers(args: { page?: number; pageSize?: number; enabled?: boolean } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return useQuery({
    enabled: args.enabled ?? true,
    queryKey: ['admin', 'users', { page, pageSize }],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/users', {
        params: { query: { page, pageSize } } as any,
      });
      if (!r.response.ok) throw r.error ?? new Error('Could not load users');
      return r.data!;
    },
  });
}

export function useAdminPolls(args: { page?: number; pageSize?: number; enabled?: boolean } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return useQuery({
    enabled: args.enabled ?? true,
    queryKey: ['admin', 'polls', { page, pageSize }],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/polls', {
        params: { query: { page, pageSize } } as any,
      });
      if (!r.response.ok) throw r.error ?? new Error('Could not load polls');
      return r.data!;
    },
  });
}

export function useSystemAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/analytics');
      if (!r.response.ok) throw r.error ?? new Error('Could not load system analytics');
      return r.data!;
    },
  });
}
