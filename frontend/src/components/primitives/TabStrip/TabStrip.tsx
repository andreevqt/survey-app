import { NavLink } from 'react-router-dom';
import type { TabStripProps } from './types';
import { useTabStrip } from './hooks/useTabStrip';

export function TabStrip({ tabs }: TabStripProps) {
  const { visible, getLinkClassName } = useTabStrip({ tabs });
  if (!visible) return null;
  return (
    <nav className="border-b border-gray-200">
      <ul className="flex gap-6">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) => getLinkClassName(isActive)}
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
