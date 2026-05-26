import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../../components/primitives/Card';
import { Badge } from '../../components/primitives/Badge';
import { Button } from '../../components/primitives/Button';
import { formatDate } from '../../lib/format-date';
import { copyToClipboard } from '../../lib/copy-to-clipboard';
import { useToggleActive } from '../../api/mutations/polls';
import type { components } from '../../api/schema';

type Poll = components['schemas']['PollSummaryDto'];

export function PollListItem({ poll, onDelete }: { poll: Poll; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const toggle = useToggleActive();
  const link = `${window.location.origin}/p/${poll.slug}`;

  return (
    <Card size="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{poll.title}</h3>
            <Badge variant={poll.visibility === 'PUBLIC' ? 'success' : 'default'}>{poll.visibility}</Badge>
            <Badge variant={poll.isActive ? 'info' : 'danger'}>{poll.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            /{poll.slug} · {poll.responseCount} response{poll.responseCount === 1 ? '' : 's'}
            {poll.expiresAt && <> · Expires {formatDate(poll.expiresAt)}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toggle.mutate({ id: poll.id, isActive: !poll.isActive })}
            isLoading={toggle.isPending}
          >
            {poll.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const ok = await copyToClipboard(link);
              toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link');
            }}
          >
            Copy link
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/polls/${poll.id}/analytics`)}>
            Analytics
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/polls/${poll.id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(poll.id)}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
