import { ReactNode } from 'react';

export interface ConfirmDialogProps {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
