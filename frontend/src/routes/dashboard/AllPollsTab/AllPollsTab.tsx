import { Card } from '../../../components/primitives/Card';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { SectionError, withErrorBoundaryAndSuspense } from '../../../components/feedback/ErrorBoundary';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { AdminPollsTable } from '../AdminPollsTable';
import { useAllPollsTab } from './hooks/useAllPollsTab';

function AllPollsTabContent() {
  const vm = useAllPollsTab();

  return (
    <div className="mt-8">
      {vm.polls.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-base font-semibold text-gray-900">No polls in the system</p>
          <p className="mt-1 text-sm text-gray-500">Once users create polls, they will show up here.</p>
        </Card>
      ) : (
        <AdminPollsTable polls={vm.polls} onDelete={vm.setPendingDeleteId} context="admin" />
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

export const AllPollsTab = withErrorBoundaryAndSuspense(AllPollsTabContent, {
  skeleton: <div className="mt-8"><SectionSpinner /></div>,
  fallback: (p) => <div className="mt-8"><SectionError {...p} message="Could not load polls." /></div>,
});
