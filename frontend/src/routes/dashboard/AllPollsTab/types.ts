import type { PollSummary } from '../AdminPollsTable/types';

export interface UseAllPollsTabResult {
  status: 'loading' | 'error' | 'empty' | 'ready';
  polls?: PollSummary[];
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
}
