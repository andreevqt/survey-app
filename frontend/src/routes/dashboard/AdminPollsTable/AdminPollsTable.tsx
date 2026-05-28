import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { DataTable } from '../../../components/primitives/DataTable';
import type { DataTableColumn } from '../../../components/primitives/DataTable';
import { useAdminPollsTable } from './hooks/useAdminPollsTable';
import type { AdminPollsTableProps, PollSummary } from './types';

export function AdminPollsTable({ polls, onDelete, context }: AdminPollsTableProps) {
  const vm = useAdminPollsTable({ polls, context });

  if (vm.search && vm.filtered.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-gray-500">No polls match "{vm.search}".</p>
      </Card>
    );
  }

  const columns: DataTableColumn<PollSummary>[] = [
    {
      key: 'poll',
      header: 'Poll',
      cell: (poll) => (
        <>
          <p className="text-sm font-medium text-gray-900">{poll.title}</p>
          <p className="text-xs text-gray-500">/{poll.slug}</p>
        </>
      ),
    },
    {
      key: 'visibility',
      header: 'Visibility',
      cell: (poll) => (
        <Badge variant={poll.visibility === 'PUBLIC' ? 'success' : 'default'}>
          {poll.visibility}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (poll) => (
        <Badge variant={poll.isActive ? 'info' : 'danger'}>
          {poll.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'responses',
      header: 'Responses',
      cell: (poll) => <span className="text-sm text-gray-700">{poll.responseCount}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (poll) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => vm.onToggleActive(poll)} isLoading={vm.isToggling}>
            {poll.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => vm.onCopyLink(poll)}>Copy link</Button>
          <Button variant="secondary" size="sm" onClick={() => vm.onNavigateAnalytics(poll)}>Analytics</Button>
          <Button variant="secondary" size="sm" onClick={() => vm.onNavigateEdit(poll)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(poll.id)}>Delete</Button>
        </div>
      ),
    },
  ];

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

      <DataTable<PollSummary>
        rows={vm.filtered}
        getRowId={(poll) => poll.id}
        columns={columns}
        selection={{
          selected: vm.selectedIds,
          onToggle: vm.toggleOne,
          onToggleAll: vm.toggleAll,
          ariaLabelAll: 'Select all polls',
          ariaLabelRow: (poll) => `Select ${poll.title}`,
        }}
      />
    </div>
  );
}
