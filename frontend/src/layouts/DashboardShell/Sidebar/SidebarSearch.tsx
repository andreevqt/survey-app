import { useSearchModal } from '../SearchModalContext';

export function SidebarSearch() {
  const { setOpen } = useSearchModal();

  return (
    <div className="px-3 pt-2 pb-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full relative flex items-center pl-8 pr-12 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-md hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
      >
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <span>Search…</span>
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
    </div>
  );
}
