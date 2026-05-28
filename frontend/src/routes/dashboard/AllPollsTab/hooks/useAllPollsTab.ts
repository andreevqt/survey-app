import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminPolls } from '../../../../api/queries/admin';
import { useDeleteAdminPoll } from '../../../../api/mutations/admin';
import type { UseAllPollsTabResult } from '../types';

export function useAllPollsTab(): UseAllPollsTabResult {
  const q = useAdminPolls();
  const del = useDeleteAdminPoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const status: UseAllPollsTabResult['status'] = q.isLoading
    ? 'loading'
    : q.isError
    ? 'error'
    : (q.data?.items.length ?? 0) === 0
    ? 'empty'
    : 'ready';

  const onConfirmDelete = () => {
    if (!pendingDeleteId) return;
    del.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success('Poll deleted');
        setPendingDeleteId(null);
      },
      onError: () => toast.error('Could not delete poll'),
    });
  };

  return {
    status,
    polls: q.data?.items,
    pendingDeleteId,
    setPendingDeleteId,
    isDeleting: del.isPending,
    onConfirmDelete,
  };
}
