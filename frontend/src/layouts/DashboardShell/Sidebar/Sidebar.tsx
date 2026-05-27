import { useAuth } from '../../../auth/useAuth';
import { BrandMark } from './BrandMark';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';

const pollsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="9" x2="17" y2="9" />
    <line x1="7" y1="13" x2="17" y2="13" />
    <line x1="7" y1="17" x2="13" y2="17" />
  </svg>
);

const usersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M15 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 h-screen w-[248px] shrink-0 bg-white border-r border-gray-200 flex flex-col"
    >
      <div className="px-3 pt-4">
        <BrandMark />
      </div>

      <SidebarSection label="Workspace">
        <SidebarItem to="/dashboard" label="My polls" icon={pollsIcon} end />
      </SidebarSection>

      {isAdmin && (
        <SidebarSection label="Staff">
          <SidebarItem to="/dashboard/all-users" label="All users" icon={usersIcon} />
        </SidebarSection>
      )}
    </nav>
  );
}
