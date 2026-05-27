import { useEffect } from 'react';

const SIZE_CLASS: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function useModal({ open, onClose, size = 'md', closeOnScrim = true }: {
  open: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
