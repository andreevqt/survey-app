import { useEffect } from 'react';
import { SIZE_CLASS } from '../constants';
import type { ModalSize } from '../types';

export function useModal({ open, onClose, size = 'md', closeOnScrim = true }: {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  closeOnScrim?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const sizeClass = SIZE_CLASS[size];
  const handleScrimClick = closeOnScrim ? onClose : undefined;
  const handleDialogClick = (e: React.MouseEvent) => e.stopPropagation();

  return { sizeClass, handleScrimClick, handleDialogClick };
}
