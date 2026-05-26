import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type Role = components['schemas']['ChangeRoleDto']['role'];

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; role: Role }) => {
      const r = await apiClient.PATCH('/admin/users/{id}/role', {
        params: { path: { id: args.id } },
        body: { role: args.role },
      });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Role change failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useBulkDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiClient.POST('/admin/users/bulk-delete', { body: { ids } });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Bulk delete failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
