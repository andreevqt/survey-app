import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAdminUsersSuspense } from '../../../../api/queries/admin';
import { useBulkDeleteUsers, useDeleteUser } from '../../../../api/mutations/admin';
import { downloadCsv } from '../../../../lib/download-csv';
import type { AdminUser } from '../../UsersTable/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export interface UsersTabViewModel {
  users: AdminUser[];
  selected: string[];
  confirming: boolean;
  isBulkDeleting: boolean;
  deleteTarget: AdminUser | null;
  isDeleting: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClearSelected: () => void;
  onAskConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onExportCsv: () => void;
  onNewUser: () => void;
  onEditUser: (user: AdminUser) => void;
  onAskDeleteUser: (user: AdminUser) => void;
  onCancelDeleteUser: () => void;
  onConfirmDeleteUser: () => void;
}

export function useUsersTab(): UsersTabViewModel {
  const navigate = useNavigate();
  const { data } = useAdminUsersSuspense();
  const bulkDelete = useBulkDeleteUsers();
  const deleteUser = useDeleteUser();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const onToggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onToggleAll = () => {
    const all = data.items.map((u) => u.id);
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

  const onConfirmDeleteUser = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Deleted ${deleteTarget.name}`);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        const map: Record<string, string> = {
          LAST_ADMIN_FORBIDDEN: 'Cannot remove the last admin',
          SELF_DELETION_FORBIDDEN: 'You cannot delete yourself',
        };
        toast.error(map[err?.code] ?? 'Delete failed');
        setDeleteTarget(null);
      },
    });
  };

  const onExportCsv = () => downloadCsv(`${API_BASE}/admin/users/export.csv`);

  return {
    users: data.items,
    selected,
    confirming,
    isBulkDeleting: bulkDelete.isPending,
    deleteTarget,
    isDeleting: deleteUser.isPending,
    onToggle,
    onToggleAll,
    onClearSelected: () => setSelected([]),
    onAskConfirmDelete: () => setConfirming(true),
    onCancelDelete: () => setConfirming(false),
    onConfirmDelete,
    onExportCsv,
    onNewUser: () => navigate('/dashboard/all-users/new'),
    onEditUser: (user) => navigate(`/dashboard/all-users/${user.id}/edit`),
    onAskDeleteUser: (user) => setDeleteTarget(user),
    onCancelDeleteUser: () => setDeleteTarget(null),
    onConfirmDeleteUser,
  };
}
