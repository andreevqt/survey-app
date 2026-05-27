import type { components } from '../../../api/schema';

export type PollSummary = components['schemas']['PollSummaryDto'];

export interface PollListItemProps {
  poll: PollSummary;
  onDelete: (id: string) => void;
}
