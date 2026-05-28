import { Badge } from '../../../components/primitives/Badge';
import { Dropdown } from '../../../components/primitives/Dropdown';
import { Avatar } from '../../../components/primitives/Avatar';
import type { UsersTableProps } from './types';
import { useUsersTable } from './hooks/useUsersTable';

export function UsersTable({ users, selected, onToggle, onToggleAll }: UsersTableProps) {
  const vm = useUsersTable({ users, selected, onToggle, onToggleAll });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="w-10 px-4 py-3 text-left">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={vm.allSelected}
                onChange={onToggleAll}
                aria-label="Select all users"
              />
            </th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Joined</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => {
            const isSel = selected.includes(u.id);
            const isMe = vm.isMe(u);
            return (
              <tr key={u.id} className={isSel ? 'bg-indigo-50/40' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={isSel}
                    disabled={isMe}
                    onChange={() => onToggle(u.id)}
                    aria-label={`Select ${u.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}{isMe && <span className="ml-2 text-xs text-gray-500">(you)</span>}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(u.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <Dropdown
                    value={u.role}
                    className="w-28"
                    disabled={isMe || vm.isChangingRole}
                    onChange={(v) => vm.onChangeRole(u, v as 'USER' | 'ADMIN')}
                    options={[
                      { value: 'USER', label: 'USER' },
                      { value: 'ADMIN', label: 'ADMIN' },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
