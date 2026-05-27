import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { copyToClipboard } from '../../../../lib/copy-to-clipboard';
import { useToggleActive } from '../../../../api/mutations/polls';
import type { PollListItemProps } from '../types';

export interface PollListItemViewModel {
  link: string;
  isToggling: boolean;
  onToggleActive: () => void;
  onCopyLink: () => Promise<void>;
  onNavigateAnalytics: () => void;
  onNavigateEdit: () => void;
  onRequestDelete: () => void;
}

export function usePollListItem({ poll, onDelete }: PollListItemProps): PollListItemViewModel {
  const navigate = useNavigate();
  const toggle = useToggleActive();
  const link = `${window.location.origin}/p/${poll.slug}`;

  const onToggleActive = () => toggle.mutate({ id: poll.id, isActive: !poll.isActive });

  const onCopyLink = async () => {
    const ok = await copyToClipboard(link);
    toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link');
  };

  const onNavigateAnalytics = () => navigate(`/polls/${poll.id}/analytics`);
  const onNavigateEdit = () => navigate(`/polls/${poll.id}/edit`);
  const onRequestDelete = () => onDelete(poll.id);

  return {
    link,
    isToggling: toggle.isPending,
    onToggleActive,
    onCopyLink,
    onNavigateAnalytics,
    onNavigateEdit,
    onRequestDelete,
  };
}
