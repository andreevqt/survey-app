import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { formatDate } from '../../../lib/format-date';
import type { PollListItemProps } from './types';
import { usePollListItem } from './hooks/usePollListItem';

export function PollListItem({ poll, onDelete }: PollListItemProps) {
  const vm = usePollListItem({ poll, onDelete });

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
            onClick={vm.onToggleActive}
            isLoading={vm.isToggling}
          >
            {poll.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="secondary" size="sm" onClick={vm.onCopyLink}>
            Copy link
          </Button>
          <Button variant="secondary" size="sm" onClick={vm.onNavigateAnalytics}>
            Analytics
          </Button>
          <Button variant="secondary" size="sm" onClick={vm.onNavigateEdit}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={vm.onRequestDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
