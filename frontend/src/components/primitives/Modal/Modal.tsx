import { useModal } from './hooks/useModal';
import type { ModalProps } from './types';

export function Modal({
  open,
  onClose,
  size = 'md',
  title,
  subtitle,
  children,
  footer,
  closeOnScrim = true,
}: ModalProps) {
  const { sizeClass, handleScrimClick, handleDialogClick } = useModal({ open, onClose, size, closeOnScrim });
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={handleScrimClick}
    >
      <div
        className={`w-full ${sizeClass} bg-white rounded-lg shadow-xl flex flex-col max-h-[calc(100vh-2rem)]`}
        onClick={handleDialogClick}
      >
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
