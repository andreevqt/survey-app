import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type UpdatePollBody = components['schemas']['UpdatePollDto'];
type CreateUserBody = components['schemas']['CreateUserDto'];
type UpdateUserBody = components['schemas']['UpdateUserDto'];

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

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const r = await apiClient.POST('/admin/users', { body });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Create failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateUserBody) => {
      const r = await apiClient.PATCH('/admin/users/{id}', {
        params: { path: { id } },
        body,
      });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Update failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.DELETE('/admin/users/{id}', { params: { path: { id } } });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Delete failed'), { code });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateAdminPoll(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePollBody) => {
      const r = await apiClient.PATCH('/admin/polls/{id}', { params: { path: { id } }, body });
      if (!r.response.ok) throw r.error ?? new Error('Update failed');
      return r.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}

export function useDeleteAdminPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.DELETE('/admin/polls/{id}', { params: { path: { id } } });
      if (!r.response.ok) throw r.error ?? new Error('Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}

export function useAdminToggleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) => {
      const r = await apiClient.PATCH('/admin/polls/{id}/active', {
        params: { path: { id: args.id } },
        body: { isActive: args.isActive },
      });
      if (!r.response.ok) throw r.error ?? new Error('Toggle failed');
      return r.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}
