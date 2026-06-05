import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../../components/primitives/Button';
import { ConfirmDialog } from '../../../../components/primitives/ConfirmDialog';
import { useAuth } from '../../../../auth/useAuth';

export function DangerZoneSection() {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const onConfirm = () => {
    setConfirming(false);
    toast.message('Account deletion — coming soon');
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-red-700">Danger zone</h3>
      <p className="mt-1 text-sm text-gray-500">Irreversible actions. Please be certain.</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Delete account</p>
          <p className="text-xs text-gray-500">
            Permanently delete your account along with all of your polls and responses. This cannot be undone.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirming(true)}>Delete account</Button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete your account?"
          body={`This will permanently erase ${user?.name ?? 'your account'} and all associated polls, questions and responses. This action cannot be undone.`}
          confirmLabel="Delete account"
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
