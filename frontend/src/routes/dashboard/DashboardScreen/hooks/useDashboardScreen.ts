import { type TabStripItem } from '../../../../components/primitives/TabStrip';
import { useAuth } from '../../../../auth/useAuth';

export function useDashboardScreen(): { userName: string | undefined; tabs: TabStripItem[] } {
  const { user } = useAuth();

  const tabs: TabStripItem[] =
    user?.role === 'ADMIN'
      ? [
          { to: '/dashboard', label: 'My polls', end: true },
          { to: '/dashboard/users', label: 'Users' },
          { to: '/dashboard/analytics', label: 'Analytics' },
        ]
      : [{ to: '/dashboard', label: 'My polls', end: true }];

  return { userName: user?.name, tabs };
}
