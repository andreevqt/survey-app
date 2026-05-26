import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type CreatePollBody = components['schemas']['CreatePollDto'];
type UpdatePollBody = components['schemas']['UpdatePollDto'];

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePollBody) => {
      const r = await apiClient.POST('/polls', { body });
      if (!r.response.ok) throw r.error ?? new Error('Create failed');
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
  });
}

export function useUpdatePoll(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePollBody) => {
      const r = await apiClient.PATCH('/polls/{id}', { params: { path: { id } }, body });
      if (!r.response.ok) throw r.error ?? new Error('Update failed');
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
  });
}

export function useDeletePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.DELETE('/polls/{id}', { params: { path: { id } } });
      if (!r.response.ok) throw r.error ?? new Error('Delete failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
  });
}

export function useToggleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) => {
      const r = await apiClient.PATCH('/polls/{id}/active', {
        params: { path: { id: args.id } },
        body: { isActive: args.isActive },
      });
      if (!r.response.ok) throw r.error ?? new Error('Toggle failed');
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
  });
}
