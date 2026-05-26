import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useMyPolls(args: { page?: number; pageSize?: number } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return useQuery({
    queryKey: ['polls', { page, pageSize }],
    queryFn: async () => {
      const r = await apiClient.GET('/polls', {
        params: { query: { page: String(page), pageSize: String(pageSize) } } as any,
      });
      if (!r.response.ok) throw r.error ?? new Error('Failed to load polls');
      return r.data!;
    },
  });
}

export function usePoll(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['polls', id],
    queryFn: async () => {
      const r = await apiClient.GET('/polls/{id}', { params: { path: { id: id! } } });
      if (!r.response.ok) throw r.error ?? new Error('Failed to load poll');
      return r.data!;
    },
  });
}
