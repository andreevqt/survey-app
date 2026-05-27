import { Link } from 'react-router-dom';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { Spinner } from '../../../components/primitives/Spinner';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { AdminPollsTable } from '../AdminPollsTable';
import { useMyPollsTab } from './hooks/useMyPollsTab';

export function MyPollsTab() {
  const vm = useMyPollsTab();

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
          <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first poll to start collecting responses.</p>
          <Link to="/dashboard/polls/new"><Button className="mt-4">Create Poll</Button></Link>
        </Card>
      ) : (
        <AdminPollsTable polls={vm.polls!} onDelete={vm.setPendingDeleteId} />
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
