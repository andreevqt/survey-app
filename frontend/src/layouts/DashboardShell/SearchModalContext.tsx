import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SearchModalValue {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const SearchModalContext = createContext<SearchModalValue | null>(null);

export function SearchModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <SearchModalContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchModalContext.Provider>
  );
}

export function useSearchModal(): SearchModalValue {
  const ctx = useContext(SearchModalContext);
  if (!ctx) throw new Error('useSearchModal must be used inside SearchModalProvider');
  return ctx;
}
