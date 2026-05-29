import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminPollsSuspense } from '../../../../api/queries/admin';
import { useDeleteAdminPoll } from '../../../../api/mutations/admin';
import type { UseAllPollsTabResult } from '../types';

export function useAllPollsTab(): UseAllPollsTabResult {
  const { data } = useAdminPollsSuspense();
  const del = useDeleteAdminPoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    polls: data.items,
    pendingDeleteId,
    setPendingDeleteId,
    isDeleting: del.isPending,
    onConfirmDelete,
  };
}
