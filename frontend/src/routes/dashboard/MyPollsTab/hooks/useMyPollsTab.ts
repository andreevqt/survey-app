import { useState } from 'react';
import { toast } from 'sonner';
import { useMyPolls } from '../../../../api/queries/polls';
import { useDeletePoll } from '../../../../api/mutations/polls';
import type { PollSummary } from '../types';

export type MyPollsTabStatus = 'loading' | 'error' | 'empty' | 'list';

export interface MyPollsTabViewModel {
  status: MyPollsTabStatus;
  polls?: PollSummary[];
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}

export function useMyPollsTab(): MyPollsTabViewModel {
  const polls = useMyPolls();
  const del = useDeletePoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  let status: MyPollsTabStatus;
  if (polls.isLoading) {
    status = 'loading';
  } else if (polls.isError) {
    status = 'error';
  } else if (!polls.data || polls.data.items.length === 0) {
    status = 'empty';
  } else {
    status = 'list';
  }

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
    status,
    polls: polls.data?.items,
    pendingDeleteId,
    setPendingDeleteId,
    onConfirmDelete,
    isDeleting: del.isPending,
  };
}
