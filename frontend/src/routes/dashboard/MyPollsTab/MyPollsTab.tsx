import { Link } from 'react-router-dom';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { ErrorBoundary, SectionError } from '../../../components/feedback/ErrorBoundary';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { Suspense } from 'react';
import { AdminPollsTable } from '../AdminPollsTable';
import { useMyPollsTab } from './hooks/useMyPollsTab';

export function MyPollsTab() {
  return (
    <ErrorBoundary fallback={(p) => <div className="mt-8"><SectionError {...p} message="Could not load polls." /></div>}>
      <Suspense fallback={<div className="mt-8"><SectionSpinner /></div>}>
        <MyPollsTabContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function MyPollsTabContent() {
  const vm = useMyPollsTab();

  return (
    <div className="mt-8">
      {vm.polls.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first poll to start collecting responses.</p>
          <Link to="/dashboard/polls/new"><Button className="mt-4">Create Poll</Button></Link>
        </Card>
      ) : (
        <AdminPollsTable polls={vm.polls} onDelete={vm.setPendingDeleteId} />
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
