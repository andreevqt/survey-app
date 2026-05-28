import { Badge } from '../../../components/primitives/Badge';
import { Select } from '../../../components/primitives/Select';
import { Avatar } from '../../../components/primitives/Avatar';
import { DataTable } from '../../../components/primitives/DataTable';
import type { DataTableColumn } from '../../../components/primitives/DataTable';
import type { AdminUser, UsersTableProps } from './types';
import { useUsersTable } from './hooks/useUsersTable';

export function UsersTable({ users, selected, onToggle, onToggleAll }: UsersTableProps) {
  const vm = useUsersTable({ users, selected, onToggle, onToggleAll });

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => {
        const isMe = vm.isMe(u);
        return (
          <div className="flex items-center gap-3">
            <Avatar name={u.name} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {u.name}
                {isMe && <span className="ml-2 text-xs text-gray-500">(you)</span>}
              </p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u) => (
        <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{u.role}</Badge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (u) => (
        <span className="text-sm text-gray-700">
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(u.createdAt))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (u) => (
        <Select
          value={u.role}
          className="w-28"
          disabled={vm.isMe(u) || vm.isChangingRole}
          onChange={(v) => vm.onChangeRole(u, v as 'USER' | 'ADMIN')}
          options={[
            { value: 'USER', label: 'USER' },
            { value: 'ADMIN', label: 'ADMIN' },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable<AdminUser>
      rows={users}
      getRowId={(u) => u.id}
      columns={columns}
      selection={{
        selected,
        onToggle,
        onToggleAll,
        isRowSelectable: (u) => !vm.isMe(u),
        ariaLabelAll: 'Select all users',
        ariaLabelRow: (u) => `Select ${u.name}`,
      }}
    />
  );
}
