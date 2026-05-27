import type { components } from '../../../api/schema';

export type PollSummary = components['schemas']['PollSummaryDto'];

export interface AdminPollsTableProps {
  polls: PollSummary[];
  onDelete: (id: string) => void;
}
