import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchModal } from '../../SearchModalContext';
import { groupLabels, mockResults, type SearchResult, type SearchResultType } from './mockResults';

const TYPE_ORDER: SearchResultType[] = ['poll', 'person', 'page'];

const typeIcon: Record<SearchResultType, ReactNode> = {
  poll: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h10" />
      <path d="M7 13h6" />
      <path d="M7 17h4" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  page: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
};

function groupResults(items: SearchResult[]): Array<{ type: SearchResultType; items: SearchResult[] }> {
  return TYPE_ORDER
    .map((type) => ({ type, items: items.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);
}

export function SearchModal() {
  const navigate = useNavigate();
  const { open, setOpen } = useSearchModal();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockResults.slice(0, 6);
    return mockResults.filter((r) =>
      r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => groupResults(results), [results]);

  if (!open) return null;

  const goTo = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" className="text-gray-400" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search polls, people, settings…"
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-lg text-gray-900 placeholder:text-gray-400 outline-none"
        />
        <kbd className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-1">Esc</kbd>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close search"
          className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl">
          {!query && (
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Suggested</p>
          )}

          {grouped.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-12">No matches for "{query}".</p>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map((group) => (
                <div key={group.type}>
                  {query && (
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                      {groupLabels[group.type]}
                    </p>
                  )}
                  <ul className="flex flex-col gap-1">
                    {group.items.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => goTo(r.href)}
                          className="w-full flex items-start gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50"
                        >
                          <span className="mt-0.5 text-gray-400">{typeIcon[r.type]}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate">{r.title}</span>
                            <span className="block text-xs text-gray-500 truncate">{r.subtitle}</span>
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">
                            {groupLabels[r.type]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
