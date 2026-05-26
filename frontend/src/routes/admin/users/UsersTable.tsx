import { useMemo } from 'react';
import { toast } from 'sonner';
import type { components } from '../../../api/schema';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';
import { Select } from '../../../components/primitives/Select';
import { Avatar } from '../../../components/primitives/Avatar';
import { useChangeUserRole } from '../../../api/mutations/admin';
import { useAuth } from '../../../auth/useAuth';

type User = components['schemas']['UserSummaryDto'];

export function UsersTable({ users, selected, onToggle, onToggleAll }: {
  users: User[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = useMemo(() => users.length > 0 && users.every((u) => selected.includes(u.id)), [users, selected]);
  const changeRole = useChangeUserRole();
  const { user: me } = useAuth();

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
            <th className="px-4 py-3 font-medium text-gray-600">User</th>
            <th className="px-4 py-3 font-medium text-gray-600">Role</th>
            <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
            <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSel = selected.includes(u.id);
            const isMe = me?.id === u.id;
            return (
              <tr key={u.id} className={isSel ? 'bg-indigo-50/40' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={isSel}
                    disabled={isMe}
                    onChange={() => onToggle(u.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900">{u.name}{isMe && <span className="ml-2 text-xs text-gray-500">(you)</span>}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(u.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <Select
                    defaultValue={u.role}
                    className="h-8 w-28 text-xs"
                    disabled={isMe || changeRole.isPending}
                    onChange={(e) => {
                      const role = e.target.value as 'USER' | 'ADMIN';
                      if (role === u.role) return;
                      changeRole.mutate({ id: u.id, role }, {
                        onSuccess: () => toast.success(`${u.name} is now ${role}`),
                        onError: (err: any) => toast.error(err?.message ?? 'Role change failed'),
                      });
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
