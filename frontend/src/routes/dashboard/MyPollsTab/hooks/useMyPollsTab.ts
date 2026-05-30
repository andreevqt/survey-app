import { useState } from 'react';
import { toast } from 'sonner';
import { useMyPollsSuspense } from '../../../../api/queries/polls';
import { useDeletePoll } from '../../../../api/mutations/polls';
import type { PollSummary } from '../types';

export interface MyPollsTabViewModel {
  polls: PollSummary[];
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}

export function useMyPollsTab(): MyPollsTabViewModel {
  const { data } = useMyPollsSuspense();
  const del = useDeletePoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const onConfirmDelete = () => {
    if (!pendingDeleteId) return;
    del.mutate(pendingDeleteId, {
      onSuccess: () => {
        setPendingDeleteId(null);
        toast.success('Poll deleted');
      },
      onError: () => toast.error('Could not delete poll'),
    });
  };

  return {
    polls: data.items,
    pendingDeleteId,
    setPendingDeleteId,
    onConfirmDelete,
    isDeleting: del.isPending,
  };
}
