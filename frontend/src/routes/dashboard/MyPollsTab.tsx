import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMyPolls } from '../../api/queries/polls';
import { useDeletePoll } from '../../api/mutations/polls';
import { Card } from '../../components/primitives/Card';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { PollListItem } from './PollListItem';

export function MyPollsTab() {
  const polls = useMyPolls();
  const del = useDeletePoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <div className="mt-8">
      {polls.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : polls.isError ? (
        <Card className="text-center">
          <p className="text-sm text-red-600">Could not load polls.</p>
        </Card>
      ) : !polls.data || polls.data.items.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first poll to start collecting responses.</p>
          <Link to="/polls/new"><Button className="mt-4">Create poll</Button></Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {polls.data.items.map((p) => (
            <PollListItem key={p.id} poll={p} onDelete={setPendingDeleteId} />
          ))}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this poll?"
          body="The poll and all its responses will be permanently removed."
          confirmLabel="Delete"
          isPending={del.isPending}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() =>
            del.mutate(pendingDeleteId, {
              onSuccess: () => {
                setPendingDeleteId(null);
                toast.success('Poll deleted');
              },
              onError: () => toast.error('Could not delete poll'),
            })
          }
        />
      )}
    </div>
  );
}
