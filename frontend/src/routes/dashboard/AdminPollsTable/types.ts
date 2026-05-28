import type { components } from '../../../api/schema';

export type PollSummary = components['schemas']['PollSummaryDto'];

export type AdminPollsTableContext = 'owner' | 'admin';

export interface AdminPollsTableProps {
  polls: PollSummary[];
  onDelete: (id: string) => void;
  context?: AdminPollsTableContext;
}
