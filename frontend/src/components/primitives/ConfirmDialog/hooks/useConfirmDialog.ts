import { MouseEvent } from 'react';
import type { ConfirmDialogProps } from '../types';

interface UseConfirmDialogResult {
  confirmVariant: 'danger' | 'primary';
  confirmLabel: string;
  handleScrimClick: () => void;
  handleDialogClick: (e: MouseEvent) => void;
}

export function useConfirmDialog({
  danger = true,
  confirmLabel = 'Delete',
  onCancel,
}: Pick<ConfirmDialogProps, 'danger' | 'confirmLabel' | 'onCancel'>): UseConfirmDialogResult {
  return {
    confirmVariant: danger ? 'danger' : 'primary',
    confirmLabel,
    handleScrimClick: onCancel,
    handleDialogClick: (e: MouseEvent) => e.stopPropagation(),
  };
}
