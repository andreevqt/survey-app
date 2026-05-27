import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminUsers } from '../../../../api/queries/admin';
import { useBulkDeleteUsers } from '../../../../api/mutations/admin';
import { downloadCsv } from '../../../../lib/download-csv';
import type { AdminUser } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export type UsersTabStatus = 'loading' | 'error' | 'list';

export interface UsersTabViewModel {
  status: UsersTabStatus;
  users?: AdminUser[];
  selected: string[];
  confirming: boolean;
  isBulkDeleting: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClearSelected: () => void;
  onAskConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onExportCsv: () => void;
}

export function useUsersTab(): UsersTabViewModel {
  const usersQ = useAdminUsers();
  const bulkDelete = useBulkDeleteUsers();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  let status: UsersTabStatus;
  if (usersQ.isLoading) {
    status = 'loading';
  } else if (usersQ.isError || !usersQ.data) {
    status = 'error';
  } else {
    status = 'list';
  }

  const onToggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onToggleAll = () => {
    if (!usersQ.data) return;
    const all = usersQ.data.items.map((u) => u.id);
    setSelected((p) => (p.length === all.length ? [] : all));
  };

  const onConfirmDelete = () => {
    bulkDelete.mutate(selected, {
      onSuccess: (r) => {
        toast.success(`Deleted ${r.count} user${r.count === 1 ? '' : 's'}`);
        setSelected([]);
        setConfirming(false);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Bulk delete failed');
        setConfirming(false);
      },
    });
  };

  const onExportCsv = () => downloadCsv(`${API_BASE}/admin/users/export.csv`);

  return {
    status,
    users: usersQ.data?.items,
    selected,
    confirming,
    isBulkDeleting: bulkDelete.isPending,
    onToggle,
    onToggleAll,
    onClearSelected: () => setSelected([]),
    onAskConfirmDelete: () => setConfirming(true),
    onCancelDelete: () => setConfirming(false),
    onConfirmDelete,
    onExportCsv,
  };
}
