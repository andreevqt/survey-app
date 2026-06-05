import { useMatch } from 'react-router-dom';
import { useAuth } from '../../../../auth/useAuth';
import { useAdminUsers, useAdminPolls } from '../../../../api/queries/admin';
import { usePoll } from '../../../../api/queries/polls';
import type { BreadcrumbItem } from '../../../../components/primitives/Breadcrumbs';

interface TopBarMeta {
  title: string;
  subtitle?: string;
  showNewPollButton: boolean;
  breadcrumbs: BreadcrumbItem[];
}

export function useTopBarMeta(): TopBarMeta {
  const { user } = useAuth();

  const dashboardMatch = useMatch('/dashboard');
  const newMatch = useMatch('/dashboard/polls/new');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');
  const adminEditMatch = useMatch('/dashboard/all-polls/:id/edit');
  const adminAnalyticsMatch = useMatch('/dashboard/all-polls/:id/analytics');
  const allUsersMatch = useMatch('/dashboard/all-users');
  const newUserMatch = useMatch('/dashboard/all-users/new');
  const editUserMatch = useMatch('/dashboard/all-users/:id/edit');
  const allPollsMatch = useMatch('/dashboard/all-polls');
  const settingsMatch = useMatch('/dashboard/settings');

  const pollId =
    editMatch?.params.id ??
    analyticsMatch?.params.id ??
    adminEditMatch?.params.id ??
    adminAnalyticsMatch?.params.id;
  const { data: poll } = usePoll(pollId);
  const { data: usersData } = useAdminUsers({
    enabled: allUsersMatch !== null || editUserMatch !== null,
  });
  const { data: pollsData } = useAdminPolls({ enabled: allPollsMatch !== null });

  const editedUserName = editUserMatch
    ? usersData?.items.find((u) => u.id === editUserMatch.params.id)?.name
    : undefined;

  if (newMatch) {
    return {
      title: 'New poll',
      subtitle: 'Build your poll and publish when ready.',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'My polls', href: '/dashboard' },
        { label: 'New poll' },
      ],
    };
  }
  if (editMatch) {
    return {
      title: 'Edit poll',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'My polls', href: '/dashboard' },
        { label: poll?.title ?? 'Edit poll' },
      ],
    };
  }
  if (analyticsMatch) {
    return {
      title: 'Analytics',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'My polls', href: '/dashboard' },
        { label: poll?.title ?? 'Analytics' },
        { label: 'Analytics' },
      ],
    };
  }
  if (adminEditMatch) {
    return {
      title: 'Edit poll',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'All polls', href: '/dashboard/all-polls' },
        { label: poll?.title ?? 'Edit poll' },
      ],
    };
  }
  if (adminAnalyticsMatch) {
    return {
      title: 'Analytics',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'All polls', href: '/dashboard/all-polls' },
        { label: poll?.title ?? 'Analytics' },
        { label: 'Analytics' },
      ],
    };
  }
  if (newUserMatch) {
    return {
      title: 'New user',
      subtitle: 'Create a new account.',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'All users', href: '/dashboard/all-users' },
        { label: 'New user' },
      ],
    };
  }
  if (editUserMatch) {
    return {
      title: 'Edit user',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'All users', href: '/dashboard/all-users' },
        { label: editedUserName ?? 'Edit user' },
      ],
    };
  }
  if (allUsersMatch) {
    return {
      title: 'All users',
      subtitle: usersData?.total !== undefined ? `${usersData.total} total users` : undefined,
      showNewPollButton: false,
      breadcrumbs: [{ label: 'All users' }],
    };
  }
  if (allPollsMatch) {
    return {
      title: 'All polls',
      subtitle: pollsData?.total !== undefined ? `${pollsData.total} total polls in the system` : undefined,
      showNewPollButton: true,
      breadcrumbs: [{ label: 'All polls' }],
    };
  }
  if (settingsMatch) {
    return {
      title: 'Settings',
      showNewPollButton: false,
      breadcrumbs: [
        { label: 'My polls', href: '/dashboard' },
        { label: 'Settings' },
      ],
    };
  }
  if (dashboardMatch) {
    return {
      title: 'My polls',
      subtitle: user?.name ? `Welcome back, ${user.name}` : undefined,
      showNewPollButton: true,
      breadcrumbs: [{ label: 'My polls' }],
    };
  }

  return { title: 'Dashboard', showNewPollButton: false, breadcrumbs: [] };
}
