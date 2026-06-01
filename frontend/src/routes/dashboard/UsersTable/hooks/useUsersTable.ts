import { useAuth } from '../../../../auth/useAuth';
import type { AdminUser, UsersTableProps } from '../types';

export interface UsersTableViewModel {
  isMe: (user: AdminUser) => boolean;
}

export function useUsersTable(_props: UsersTableProps): UsersTableViewModel {
  const { user: me } = useAuth();
  const isMe = (user: AdminUser) => me?.id === user.id;
  return { isMe };
}
