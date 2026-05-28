export type SearchResultType = 'poll' | 'person' | 'page';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

export const mockResults: SearchResult[] = [
  { id: 'p1', type: 'poll', title: 'Lunch options for Friday', subtitle: '/lunch-friday · 12 responses', href: '/dashboard' },
  { id: 'p2', type: 'poll', title: 'Q3 OKR retrospective', subtitle: '/q3-okr-retro · 4 responses', href: '/dashboard' },
  { id: 'p3', type: 'poll', title: 'Office music preferences', subtitle: '/office-music · 38 responses', href: '/dashboard' },
  { id: 'p4', type: 'poll', title: 'Remote work hours', subtitle: '/remote-hours · Draft', href: '/dashboard' },

  { id: 'u1', type: 'person', title: 'Alice Andersen', subtitle: 'alice@polls.local · Admin', href: '/dashboard/all-users' },
  { id: 'u2', type: 'person', title: 'Bob Brown', subtitle: 'bob@polls.local · User', href: '/dashboard/all-users' },
  { id: 'u3', type: 'person', title: 'Carol Chen', subtitle: 'carol@polls.local · User', href: '/dashboard/all-users' },

  { id: 'pg1', type: 'page', title: 'All polls', subtitle: 'Staff · Browse every poll in the workspace', href: '/dashboard/all-polls' },
  { id: 'pg2', type: 'page', title: 'All users', subtitle: 'Staff · Manage members and roles', href: '/dashboard/all-users' },
  { id: 'pg3', type: 'page', title: 'Settings', subtitle: 'Profile, password, notifications', href: '/dashboard/settings' },
  { id: 'pg4', type: 'page', title: 'New poll', subtitle: 'Create a new poll from scratch', href: '/dashboard/polls/new' },
];

export const groupLabels: Record<SearchResultType, string> = {
  poll: 'Polls',
  person: 'People',
  page: 'Pages',
};
