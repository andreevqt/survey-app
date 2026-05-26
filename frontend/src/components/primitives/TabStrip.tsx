import { NavLink } from 'react-router-dom';

export type TabStripItem = { to: string; label: string; end?: boolean };

export function TabStrip({ tabs }: { tabs: TabStripItem[] }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="border-b border-gray-200">
      <ul className="flex gap-6">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `inline-block py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
