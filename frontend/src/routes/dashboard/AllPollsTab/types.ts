import type { PollSummary } from '../AdminPollsTable/types';

export interface UseAllPollsTabResult {
  polls: PollSummary[];
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
}
