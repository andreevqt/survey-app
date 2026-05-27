import type { ReactNode } from 'react';

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div className="px-3 pt-4">
      <h2 className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}
