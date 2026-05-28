import { Card } from '../../../components/primitives/Card';
import { Spinner } from '../../../components/primitives/Spinner';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { AdminPollsTable } from '../AdminPollsTable';
import { useAllPollsTab } from './hooks/useAllPollsTab';

export function AllPollsTab() {
  const vm = useAllPollsTab();

  return (
    <div className="mt-8">
      {vm.status === 'loading' ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : vm.status === 'error' ? (
        <Card className="text-center">
          <p className="text-sm text-red-600">Could not load polls.</p>
        </Card>
      ) : vm.status === 'empty' ? (
        <Card className="text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-base font-semibold text-gray-900">No polls in the system</p>
          <p className="mt-1 text-sm text-gray-500">Once users create polls, they will show up here.</p>
        </Card>
      ) : (
        <AdminPollsTable polls={vm.polls!} onDelete={vm.setPendingDeleteId} context="admin" />
      )}

      {vm.pendingDeleteId && (
        <ConfirmDialog
          title="Delete this poll?"
          body="The poll and all its responses will be permanently removed."
          confirmLabel="Delete"
          isPending={vm.isDeleting}
          onCancel={() => vm.setPendingDeleteId(null)}
          onConfirm={vm.onConfirmDelete}
        />
      )}
    </div>
  );
}
