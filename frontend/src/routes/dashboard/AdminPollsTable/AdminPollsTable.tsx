import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { useAdminPollsTable } from './hooks/useAdminPollsTable';
import type { AdminPollsTableProps } from './types';

export function AdminPollsTable({ polls, onDelete }: AdminPollsTableProps) {
  const vm = useAdminPollsTable({ polls });

  if (vm.search && vm.filtered.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-gray-500">No polls match "{vm.search}".</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {vm.selectedIds.length > 0
            ? `${vm.selectedIds.length} selected`
            : `${vm.filtered.length} ${vm.filtered.length === 1 ? 'poll' : 'polls'}`}
        </p>
        <Button variant="secondary" size="sm" onClick={vm.onExportCsv}>Export CSV</Button>
      </div>

      {vm.selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {vm.selectedIds.length} {vm.selectedIds.length === 1 ? 'poll' : 'polls'} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={vm.clearSelection}>Clear</Button>
            <Button variant="danger" size="sm" onClick={vm.onBulkDelete}>Delete selected</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={vm.allSelected}
                  onChange={vm.toggleAll}
                  aria-label="Select all polls"
                />
              </th>
              <th className="px-4 py-3 text-left">Poll</th>
              <th className="px-4 py-3 text-left">Visibility</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Responses</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vm.filtered.map((poll) => {
              const isSelected = vm.selectedIds.includes(poll.id);
              return (
                <tr key={poll.id} className={isSelected ? 'bg-indigo-50/40' : ''}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={isSelected}
                      onChange={() => vm.toggleOne(poll.id)}
                      aria-label={`Select ${poll.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{poll.title}</p>
                    <p className="text-xs text-gray-500">/{poll.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={poll.visibility === 'PUBLIC' ? 'success' : 'default'}>{poll.visibility}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={poll.isActive ? 'info' : 'danger'}>{poll.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{poll.responseCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => vm.onToggleActive(poll)} isLoading={vm.isToggling}>
                        {poll.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => vm.onCopyLink(poll)}>Copy link</Button>
                      <Button variant="secondary" size="sm" onClick={() => vm.onNavigateAnalytics(poll)}>Analytics</Button>
                      <Button variant="secondary" size="sm" onClick={() => vm.onNavigateEdit(poll)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => onDelete(poll.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
