import { Button } from '../../../components/primitives/Button';
import { Spinner } from '../../../components/primitives/Spinner';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { UsersTable } from '../UsersTable';
import { useUsersTab } from './hooks/useUsersTab';

export function UsersTab() {
  const vm = useUsersTab();

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-end">
        <Button variant="secondary" size="sm" onClick={vm.onExportCsv}>
          Export CSV
        </Button>
      </div>

      {vm.selected.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-indigo-50 border border-indigo-100 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {vm.selected.length} user{vm.selected.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={vm.onClearSelected}>Clear</Button>
            <Button variant="danger" size="sm" onClick={vm.onAskConfirmDelete}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {vm.status === 'loading' ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : vm.status === 'error' ? (
        <p className="text-sm text-red-600">Could not load users.</p>
      ) : (
        <UsersTable
          users={vm.users!}
          selected={vm.selected}
          onToggle={vm.onToggle}
          onToggleAll={vm.onToggleAll}
        />
      )}

      {vm.confirming && (
        <ConfirmDialog
          title={`Delete ${vm.selected.length} user${vm.selected.length === 1 ? '' : 's'}?`}
          body="This will permanently delete the selected accounts and all their polls."
          confirmLabel="Delete"
          isPending={vm.isBulkDeleting}
          onCancel={vm.onCancelDelete}
          onConfirm={vm.onConfirmDelete}
        />
      )}
    </div>
  );
}
