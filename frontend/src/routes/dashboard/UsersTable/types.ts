import type { components } from '../../../api/schema';

export type AdminUser = components['schemas']['UserSummaryDto'];

export interface UsersTableProps {
  users: AdminUser[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}
