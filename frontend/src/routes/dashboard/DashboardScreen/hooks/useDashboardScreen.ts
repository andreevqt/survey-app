import { useLocation } from 'react-router-dom';
import { type TabStripItem } from '../../../../components/primitives/TabStrip';
import { useAuth } from '../../../../auth/useAuth';
import type { TabMeta } from '../types';

function tabMetaForPath(pathname: string, userName?: string): TabMeta {
  if (pathname.startsWith('/dashboard/users')) {
    return { title: 'Users', showCreateCta: false };
  }
  if (pathname.startsWith('/dashboard/analytics')) {
    return { title: 'Analytics', showCreateCta: false };
  }
  return {
    title: 'My polls',
    subtitle: userName ? `Welcome back, ${userName}.` : undefined,
    showCreateCta: true,
  };
}

export function useDashboardScreen(): { meta: TabMeta; tabs: TabStripItem[] } {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const meta = tabMetaForPath(pathname, user?.name);

  const tabs: TabStripItem[] =
    user?.role === 'ADMIN'
      ? [
          { to: '/dashboard', label: 'My polls', end: true },
          { to: '/dashboard/users', label: 'Users' },
          { to: '/dashboard/analytics', label: 'Analytics' },
        ]
      : [{ to: '/dashboard', label: 'My polls', end: true }];

  return { meta, tabs };
}
