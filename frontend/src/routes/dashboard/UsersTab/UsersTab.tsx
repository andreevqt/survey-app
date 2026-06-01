import { Button } from '../../../components/primitives/Button';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { SectionError, withErrorBoundaryAndSuspense } from '../../../components/feedback/ErrorBoundary';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { UsersTable } from '../UsersTable';
import { useUsersTab } from './hooks/useUsersTab';

function UsersTabContent() {
  const vm = useUsersTab();

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={vm.onExportCsv}>
          Export CSV
        </Button>
        <Button size="sm" onClick={vm.onNewUser}>
          New user
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

      <UsersTable
        users={vm.users}
        selected={vm.selected}
        onToggle={vm.onToggle}
        onToggleAll={vm.onToggleAll}
        onEdit={vm.onEditUser}
        onDelete={vm.onAskDeleteUser}
      />

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

      {vm.deleteTarget && (
        <ConfirmDialog
          title={`Delete ${vm.deleteTarget.name}?`}
          body="This will permanently delete this account and all their polls."
          confirmLabel="Delete"
          isPending={vm.isDeleting}
          onCancel={vm.onCancelDeleteUser}
          onConfirm={vm.onConfirmDeleteUser}
        />
      )}
    </div>
  );
}

export const UsersTab = withErrorBoundaryAndSuspense(UsersTabContent, {
  skeleton: <div className="mt-6"><SectionSpinner /></div>,
  fallback: (p) => <div className="mt-6"><SectionError {...p} message="Could not load users." /></div>,
});
