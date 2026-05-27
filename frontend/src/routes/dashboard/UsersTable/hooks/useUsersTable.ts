import { useMemo } from 'react';
import { toast } from 'sonner';
import { useChangeUserRole } from '../../../../api/mutations/admin';
import { useAuth } from '../../../../auth/useAuth';
import type { AdminUser, UsersTableProps } from '../types';

export interface UsersTableViewModel {
  allSelected: boolean;
  isMe: (user: AdminUser) => boolean;
  isChangingRole: boolean;
  onChangeRole: (user: AdminUser, role: 'USER' | 'ADMIN') => void;
}

export function useUsersTable(props: UsersTableProps): UsersTableViewModel {
  const { users, selected } = props;
  const allSelected = useMemo(
    () => users.length > 0 && users.every((u) => selected.includes(u.id)),
    [users, selected],
  );
  const changeRole = useChangeUserRole();
  const { user: me } = useAuth();

  const isMe = (user: AdminUser) => me?.id === user.id;

  const onChangeRole = (user: AdminUser, role: 'USER' | 'ADMIN') => {
    if (role === user.role) return;
    changeRole.mutate({ id: user.id, role }, {
      onSuccess: () => toast.success(`${user.name} is now ${role}`),
      onError: (err: any) => toast.error(err?.message ?? 'Role change failed'),
    });
  };

  return {
    allSelected,
    isMe,
    isChangingRole: changeRole.isPending,
    onChangeRole,
  };
}
