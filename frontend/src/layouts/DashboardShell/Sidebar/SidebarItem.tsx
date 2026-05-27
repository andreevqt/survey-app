import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SidebarItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export function SidebarItem({ to, label, icon, end }: SidebarItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`
        }
      >
        <span className="shrink-0" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </NavLink>
    </li>
  );
}
