import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { copyToClipboard } from '../../../../lib/copy-to-clipboard';
import { useToggleActive } from '../../../../api/mutations/polls';
import { useAdminToggleActive } from '../../../../api/mutations/admin';
import { useSidebarSearch } from '../../../../layouts/DashboardShell/SidebarSearchContext';
import type { AdminPollsTableContext, PollSummary } from '../types';

export function useAdminPollsTable({
  polls,
  context = 'owner',
}: {
  polls: PollSummary[];
  context?: AdminPollsTableContext;
}) {
  const navigate = useNavigate();
  const ownerToggle = useToggleActive();
  const adminToggle = useAdminToggleActive();
  const toggle = context === 'admin' ? adminToggle : ownerToggle;
  const { search } = useSidebarSearch();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return polls;
    return polls.filter((p) =>
      p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [polls, search]);

  const allFilteredIds = filtered.map((p) => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => setSelectedIds(allSelected ? [] : allFilteredIds);
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

  const onToggleActive = (poll: PollSummary) =>
    toggle.mutate({ id: poll.id, isActive: !poll.isActive });

  const onCopyLink = async (poll: PollSummary) => {
    const link = `${window.location.origin}/p/${poll.slug}`;
    const ok = await copyToClipboard(link);
    toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link');
  };

  const editPath = (poll: PollSummary) =>
    context === 'admin' ? `/dashboard/all-polls/${poll.id}/edit` : `/dashboard/polls/${poll.id}/edit`;
  const analyticsPath = (poll: PollSummary) =>
    context === 'admin' ? `/dashboard/all-polls/${poll.id}/analytics` : `/dashboard/polls/${poll.id}/analytics`;

  const onNavigateAnalytics = (poll: PollSummary) => navigate(analyticsPath(poll));
  const onNavigateEdit = (poll: PollSummary) => navigate(editPath(poll));

  const onExportCsv = () => toast.message('Export CSV — coming soon');
  const onBulkDelete = () => toast.message('Bulk delete — coming soon');

  return {
    filtered,
    selectedIds,
    toggleAll,
    toggleOne,
    clearSelection,
    search,
    onToggleActive,
    onCopyLink,
    onNavigateAnalytics,
    onNavigateEdit,
    onExportCsv,
    onBulkDelete,
    isToggling: toggle.isPending,
  };
}
