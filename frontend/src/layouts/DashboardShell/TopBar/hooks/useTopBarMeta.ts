import { useLocation, useMatch } from 'react-router-dom';
import { useAuth } from '../../../../auth/useAuth';
import { useAdminUsers } from '../../../../api/queries/admin';
import { usePoll } from '../../../../api/queries/polls';

interface TopBarMeta {
  title: string;
  subtitle?: string;
  showNewPollButton: boolean;
}

export function useTopBarMeta(): TopBarMeta {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const dashboardMatch = useMatch('/dashboard');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');
  const allUsersMatch = useMatch('/dashboard/all-users');

  const pollId = editMatch?.params.id ?? analyticsMatch?.params.id;
  const { data: poll } = usePoll(pollId);
  const { data: usersData } = useAdminUsers({ enabled: allUsersMatch !== null });

  if (pathname === '/dashboard/polls/new') {
    return {
      title: 'New poll',
      subtitle: 'Build your poll and publish when ready.',
      showNewPollButton: false,
    };
  }
  if (editMatch) {
    return {
      title: 'Edit poll',
      subtitle: poll?.title,
      showNewPollButton: false,
    };
  }
  if (analyticsMatch) {
    return {
      title: 'Analytics',
      subtitle: poll?.title,
      showNewPollButton: false,
    };
  }
  if (allUsersMatch) {
    return {
      title: 'All users',
      subtitle: usersData?.total !== undefined ? `${usersData.total} total users` : undefined,
      showNewPollButton: false,
    };
  }

  if (dashboardMatch) {
    return {
      title: 'My polls',
      subtitle: user?.name ? `Welcome back, ${user.name}` : undefined,
      showNewPollButton: true,
    };
  }

  return {
    title: 'Dashboard',
    showNewPollButton: false,
  };
}
