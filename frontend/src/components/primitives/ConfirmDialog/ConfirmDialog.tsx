import { Button } from '../Button';
import type { ConfirmDialogProps } from './types';
import { useConfirmDialog } from './hooks/useConfirmDialog';

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  isPending,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const derived = useConfirmDialog({ danger, confirmLabel, onCancel });
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={derived.handleScrimClick}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={derived.handleDialogClick}
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {body && <div className="mt-2 text-sm text-gray-600">{body}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={derived.confirmVariant} isLoading={isPending} onClick={onConfirm}>
            {derived.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
