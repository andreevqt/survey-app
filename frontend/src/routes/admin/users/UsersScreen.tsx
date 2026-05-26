import { useState } from 'react';
import { toast } from 'sonner';
import { AdminHeader } from '../../../layouts/AdminLayout/AdminHeader';
import { Button } from '../../../components/primitives/Button';
import { Spinner } from '../../../components/primitives/Spinner';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { useAdminUsers } from '../../../api/queries/admin';
import { useBulkDeleteUsers } from '../../../api/mutations/admin';
import { UsersTable } from './UsersTable';
import { downloadCsv } from '../../../lib/download-csv';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export function UsersScreen() {
  const usersQ = useAdminUsers();
  const bulkDelete = useBulkDeleteUsers();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => {
    if (!usersQ.data) return;
    const all = usersQ.data.items.map((u) => u.id);
    setSelected((p) => (p.length === all.length ? [] : all));
  };

  const confirmDelete = () => {
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

  return (
    <>
      <AdminHeader
        title="Users"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(`${API_BASE}/admin/users/export.csv`)}
          >
            Export CSV
          </Button>
        }
      />
      <div className="p-6 max-w-5xl">
        {selected.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-indigo-50 border border-indigo-100 px-4 py-3">
            <span className="text-sm font-medium text-indigo-700">
              {selected.length} user{selected.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelected([])}>Clear</Button>
              <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
                Delete selected
              </Button>
            </div>
          </div>
        )}
        {usersQ.isLoading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : usersQ.isError || !usersQ.data ? (
          <p className="text-sm text-red-600">Could not load users.</p>
        ) : (
          <UsersTable
            users={usersQ.data.items}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.length} user${selected.length === 1 ? '' : 's'}?`}
          body="This will permanently delete the selected accounts and all their polls."
          confirmLabel="Delete"
          isPending={bulkDelete.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
