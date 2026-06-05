import clsx from 'clsx';
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
        className={clsx('w-full', sizeClass, 'bg-white rounded-lg shadow-xl flex flex-col max-h-[calc(100vh-2rem)]')}
        onClick={handleDialogClick}
      >
        <div className="px-6 pt-5 pb-3 border-b border-gray-200 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 id="modal-title" className="text-2xl font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 shrink-0 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
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
