import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarSearchValue {
  search: string;
  setSearch: (value: string) => void;
}

const SidebarSearchContext = createContext<SidebarSearchValue | null>(null);

export function SidebarSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  return (
    <SidebarSearchContext.Provider value={{ search, setSearch }}>
      {children}
    </SidebarSearchContext.Provider>
  );
}

export function useSidebarSearch(): SidebarSearchValue {
  const ctx = useContext(SidebarSearchContext);
  if (!ctx) throw new Error('useSidebarSearch must be used inside SidebarSearchProvider');
  return ctx;
}
