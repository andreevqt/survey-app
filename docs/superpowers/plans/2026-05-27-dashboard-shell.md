# Dashboard Shell Implementation Plan (Spec 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing tab-strip dashboard with the canonical design's two-column shell (sidebar + sticky top bar), nest existing pages (My polls, Users, create/edit/analytics) inside the shell, and redirect old `/polls/*` and `/dashboard/users` URLs to the new paths.

**Architecture:** New folder `frontend/src/layouts/DashboardShell/` hosting the shell, sidebar, and top bar. Router restructure: `/dashboard/*` routes live under a single `<DashboardShell />` layout route (with `RequireAuth`). Existing tab content components (`MyPollsTab`, `UsersTab`, `PollFormScreen`, `OwnerAnalyticsScreen`) are reused unchanged, nested via `<Outlet />`. Obsolete dashboard chrome (`DashboardScreen`, `AnalyticsTab`, `TabStrip`) is deleted.

**Tech Stack:** React 19 + TypeScript + react-router-dom 6 + Tailwind. No backend changes. No new dependencies. Tests deferred per project preference; verification = `tsc --noEmit` + manual smoke after final task.

**Spec:** [docs/superpowers/specs/2026-05-27-dashboard-shell-design.md](../specs/2026-05-27-dashboard-shell-design.md)

---

## File map

**Create** (under `frontend/src/layouts/DashboardShell/`):
- `DashboardShell.tsx`
- `index.ts`
- `Sidebar/Sidebar.tsx`
- `Sidebar/SidebarSection.tsx`
- `Sidebar/SidebarItem.tsx`
- `Sidebar/BrandMark.tsx`
- `Sidebar/index.ts`
- `TopBar/TopBar.tsx`
- `TopBar/TopBarActions.tsx`
- `TopBar/AvatarMenu.tsx`
- `TopBar/hooks/useTopBarMeta.ts`
- `TopBar/index.ts`

**Modify:**
- `frontend/src/api/queries/admin.ts` — add `enabled` param to `useAdminUsers`
- `frontend/src/router.tsx` — new nested route structure + redirects
- `frontend/src/routes/dashboard/MyPollsTab/MyPollsTab.tsx` — link to `/dashboard/polls/new`
- `frontend/src/routes/dashboard/PollListItem/hooks/usePollListItem.ts` — navigate to `/dashboard/polls/:id/...`

**Delete (entire folders):**
- `frontend/src/routes/dashboard/DashboardScreen/`
- `frontend/src/routes/dashboard/AnalyticsTab/`
- `frontend/src/components/primitives/TabStrip/`

---

## Task 1: Sidebar components

**Files:**
- Create: `frontend/src/layouts/DashboardShell/Sidebar/BrandMark.tsx`
- Create: `frontend/src/layouts/DashboardShell/Sidebar/SidebarItem.tsx`
- Create: `frontend/src/layouts/DashboardShell/Sidebar/SidebarSection.tsx`
- Create: `frontend/src/layouts/DashboardShell/Sidebar/Sidebar.tsx`
- Create: `frontend/src/layouts/DashboardShell/Sidebar/index.ts`

- [ ] **Step 1: Create `BrandMark.tsx`**

Write `frontend/src/layouts/DashboardShell/Sidebar/BrandMark.tsx`:

```tsx
export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-3.5">
      <svg viewBox="0 0 48 48" width={26} height={26} aria-hidden="true">
        <rect width="48" height="48" rx="11" fill="#4F46E5" />
        <circle cx="13" cy="16" r="3.25" fill="#fff" />
        <circle cx="13" cy="16" r="1.4" fill="#4F46E5" />
        <rect x="20" y="14" width="18" height="4" rx="2" fill="#fff" />
        <circle cx="13" cy="24" r="3.25" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.6" />
        <rect x="20" y="22" width="14" height="4" rx="2" fill="#fff" opacity="0.55" />
        <circle cx="13" cy="32" r="3.25" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.6" />
        <rect x="20" y="30" width="10" height="4" rx="2" fill="#fff" opacity="0.55" />
      </svg>
      <span className="text-base font-bold text-gray-900 tracking-tight">Polls</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `SidebarItem.tsx`**

Write `frontend/src/layouts/DashboardShell/Sidebar/SidebarItem.tsx`:

```tsx
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
```

- [ ] **Step 3: Create `SidebarSection.tsx`**

Write `frontend/src/layouts/DashboardShell/Sidebar/SidebarSection.tsx`:

```tsx
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
```

- [ ] **Step 4: Create `Sidebar.tsx`**

Write `frontend/src/layouts/DashboardShell/Sidebar/Sidebar.tsx`:

```tsx
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
```

- [ ] **Step 5: Create `index.ts`**

Write `frontend/src/layouts/DashboardShell/Sidebar/index.ts`:

```ts
export { Sidebar } from './Sidebar';
```

- [ ] **Step 6: Typecheck**

Run:

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean (no errors). The new files are not imported anywhere yet, but they typecheck on their own.

- [ ] **Step 7: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/Sidebar/ && \
git commit -m "$(cat <<'EOF'
feat(frontend): add DashboardShell Sidebar components

Brand mark, sidebar items (NavLink wrappers with active styling),
section headers, and the Sidebar composition with Workspace section
(My polls) and Staff section (All users, admin only). Not wired into
the router yet.

Spec: docs/superpowers/specs/2026-05-27-dashboard-shell-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TopBar components + useTopBarMeta hook

**Files:**
- Modify: `frontend/src/api/queries/admin.ts` (add `enabled` param)
- Create: `frontend/src/layouts/DashboardShell/TopBar/hooks/useTopBarMeta.ts`
- Create: `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx`
- Create: `frontend/src/layouts/DashboardShell/TopBar/TopBarActions.tsx`
- Create: `frontend/src/layouts/DashboardShell/TopBar/TopBar.tsx`
- Create: `frontend/src/layouts/DashboardShell/TopBar/index.ts`

- [ ] **Step 1: Add `enabled` param to `useAdminUsers`**

Read `frontend/src/api/queries/admin.ts` first. Replace the contents of that file with:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useAdminUsers(args: { page?: number; pageSize?: number; enabled?: boolean } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return useQuery({
    enabled: args.enabled ?? true,
    queryKey: ['admin', 'users', { page, pageSize }],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/users', {
        params: { query: { page, pageSize } } as any,
      });
      if (!r.response.ok) throw r.error ?? new Error('Could not load users');
      return r.data!;
    },
  });
}

export function useSystemAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/analytics');
      if (!r.response.ok) throw r.error ?? new Error('Could not load system analytics');
      return r.data!;
    },
  });
}
```

(Only change: added `enabled?: boolean` param to `useAdminUsers` and threaded it into the `useQuery` options. `useSystemAnalytics` is left untouched — it's used by the soon-to-be-deleted `AnalyticsTab`, but cleanup of that hook happens in Task 5.)

- [ ] **Step 2: Create `useTopBarMeta.ts`**

Write `frontend/src/layouts/DashboardShell/TopBar/hooks/useTopBarMeta.ts`:

```ts
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

  return {
    title: 'My polls',
    subtitle: user?.name ? `Welcome back, ${user.name}` : undefined,
    showNewPollButton: true,
  };
}
```

- [ ] **Step 3: Create `AvatarMenu.tsx`**

Write `frontend/src/layouts/DashboardShell/TopBar/AvatarMenu.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../../components/primitives/Avatar';
import { useAuth } from '../../../auth/useAuth';
import { useLogoutMutation } from '../../../auth/auth-mutations';

export function AvatarMenu() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logout.mutate(undefined, { onSuccess: () => navigate('/') });
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Account';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 ml-1 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Avatar name={user?.name ?? '?'} size="sm" />
        <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">{firstName}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="text-gray-400" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-md bg-white border border-gray-200 shadow-lg py-1 z-20"
        >
          <li role="menuitem">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `TopBarActions.tsx`**

Write `frontend/src/layouts/DashboardShell/TopBar/TopBarActions.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { AvatarMenu } from './AvatarMenu';

interface TopBarActionsProps {
  showNewPollButton: boolean;
}

export function TopBarActions({ showNewPollButton }: TopBarActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {showNewPollButton && (
        <Link to="/dashboard/polls/new">
          <Button size="sm">+ New poll</Button>
        </Link>
      )}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => { /* placeholder */ }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Help"
        onClick={() => { /* placeholder */ }}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
      <AvatarMenu />
    </div>
  );
}
```

- [ ] **Step 5: Create `TopBar.tsx`**

Write `frontend/src/layouts/DashboardShell/TopBar/TopBar.tsx`:

```tsx
import { useTopBarMeta } from './hooks/useTopBarMeta';
import { TopBarActions } from './TopBarActions';

export function TopBar() {
  const { title, subtitle, showNewPollButton } = useTopBarMeta();

  return (
    <header className="sticky top-0 z-10 h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
      <TopBarActions showNewPollButton={showNewPollButton} />
    </header>
  );
}
```

- [ ] **Step 6: Create `index.ts`**

Write `frontend/src/layouts/DashboardShell/TopBar/index.ts`:

```ts
export { TopBar } from './TopBar';
```

- [ ] **Step 7: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/api/queries/admin.ts frontend/src/layouts/DashboardShell/TopBar/ && \
git commit -m "$(cat <<'EOF'
feat(frontend): add DashboardShell TopBar components

Sticky 64px top bar with per-tab title/subtitle derived from
pathname, conditional +New poll button (only on My polls tab),
visual-only Notifications and Help icon buttons, and an AvatarMenu
dropdown with a single Sign out item. Also adds an enabled flag to
useAdminUsers so the All users count subtitle only fetches when on
that tab. Not wired into the router yet.

Spec: docs/superpowers/specs/2026-05-27-dashboard-shell-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: DashboardShell composition

**Files:**
- Create: `frontend/src/layouts/DashboardShell/DashboardShell.tsx`
- Create: `frontend/src/layouts/DashboardShell/index.ts`

- [ ] **Step 1: Create `DashboardShell.tsx`**

Write `frontend/src/layouts/DashboardShell/DashboardShell.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function DashboardShell() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `index.ts`**

Write `frontend/src/layouts/DashboardShell/index.ts`:

```ts
export { DashboardShell } from './DashboardShell';
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/DashboardShell.tsx frontend/src/layouts/DashboardShell/index.ts && \
git commit -m "$(cat <<'EOF'
feat(frontend): add DashboardShell composition

Two-column layout: Sidebar (sticky left rail) + main column with
sticky TopBar and an Outlet for nested routes. Standalone; the
router still uses the old DashboardScreen until Task 4 wires this
in.

Spec: docs/superpowers/specs/2026-05-27-dashboard-shell-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire the router + update outbound links

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/routes/dashboard/MyPollsTab/MyPollsTab.tsx`
- Modify: `frontend/src/routes/dashboard/PollListItem/hooks/usePollListItem.ts`

- [ ] **Step 1: Replace `router.tsx`**

Replace the full contents of `frontend/src/router.tsx` with:

```tsx
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { DashboardShell } from './layouts/DashboardShell';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { MyPollsTab } from './routes/dashboard/MyPollsTab';
import { UsersTab } from './routes/dashboard/UsersTab';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { PollFormScreen } from './routes/polls/PollFormScreen';
import { PollScreen } from './routes/poll/PollScreen';
import { OwnerAnalyticsScreen } from './routes/polls/analytics/OwnerAnalyticsScreen';

function RedirectWithId({ template }: { template: string }) {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={template.replace(':id', id ?? '')} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },

  {
    element: <MainLayout />,
    children: [
      { path: '/p/:slug', element: <PollScreen /> },
    ],
  },

  {
    path: '/dashboard',
    element: <RequireAuth><DashboardShell /></RequireAuth>,
    children: [
      { index: true, element: <MyPollsTab /> },
      { path: 'all-users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'polls/new', element: <PollFormScreen /> },
      { path: 'polls/:id/edit', element: <PollFormScreen /> },
      { path: 'polls/:id/analytics', element: <OwnerAnalyticsScreen /> },
    ],
  },

  { path: '/polls/new', element: <Navigate to="/dashboard/polls/new" replace /> },
  { path: '/polls/:id/edit', element: <RedirectWithId template="/dashboard/polls/:id/edit" /> },
  { path: '/polls/:id/analytics', element: <RedirectWithId template="/dashboard/polls/:id/analytics" /> },
  { path: '/dashboard/users', element: <Navigate to="/dashboard/all-users" replace /> },
  { path: '/dashboard/analytics', element: <Navigate to="/dashboard" replace /> },
  { path: '/admin', element: <Navigate to="/dashboard" replace /> },
  { path: '/admin/users', element: <Navigate to="/dashboard/all-users" replace /> },
  { path: '/admin/analytics', element: <Navigate to="/dashboard" replace /> },

  { path: '*', element: <Navigate to="/" replace /> },
]);
```

Changes from previous version:
- New import of `DashboardShell` and `useParams` (for `RedirectWithId`).
- Removed imports of `DashboardScreen` and `AnalyticsTab` (deleted in Task 5).
- New small helper `RedirectWithId` substitutes the matched `:id` into the target template — needed because `<Navigate to="/.../:id/..." />` does NOT substitute params and would navigate to a literal `:id` string.
- `/dashboard` is its own top-level route (not nested under `MainLayout`); element is `<RequireAuth><DashboardShell /></RequireAuth>`.
- Children of `/dashboard` are flat: index (`MyPollsTab`), `all-users`, `polls/new`, `polls/:id/edit`, `polls/:id/analytics`.
- `MainLayout` now wraps only `/p/:slug`.
- Old `/polls/*` paths with `:id` use `<RedirectWithId />`; static paths use `<Navigate replace />`.

- [ ] **Step 2: Update `MyPollsTab.tsx` link**

Read `frontend/src/routes/dashboard/MyPollsTab/MyPollsTab.tsx`. Find the line:

```tsx
<Link to="/polls/new"><Button className="mt-4">Create Poll</Button></Link>
```

Replace with:

```tsx
<Link to="/dashboard/polls/new"><Button className="mt-4">Create Poll</Button></Link>
```

(The redirect would handle the old URL, but pointing directly at the new URL avoids the extra hop.)

- [ ] **Step 3: Update `usePollListItem.ts` navigation paths**

Read `frontend/src/routes/dashboard/PollListItem/hooks/usePollListItem.ts`. Find:

```ts
  const onNavigateAnalytics = () => navigate(`/polls/${poll.id}/analytics`);
  const onNavigateEdit = () => navigate(`/polls/${poll.id}/edit`);
```

Replace with:

```ts
  const onNavigateAnalytics = () => navigate(`/dashboard/polls/${poll.id}/analytics`);
  const onNavigateEdit = () => navigate(`/dashboard/polls/${poll.id}/edit`);
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: TypeScript will complain that `DashboardScreen` and `AnalyticsTab` are no longer imported but their files still exist (and probably import things that need them to compile). Specifically:
- `routes/dashboard/DashboardScreen/DashboardScreen.tsx` imports `Button`, `Link`, `Outlet`, `TabStrip`, `useDashboardScreen` — these still exist, so it compiles in isolation.
- `routes/dashboard/AnalyticsTab/AnalyticsTab.tsx` may use `useSystemAnalytics` — still exists.

If typecheck is clean, proceed. If there are unexpected errors (e.g. `cannot find module './routes/dashboard/DashboardScreen'`), that means a stale import somewhere — grep:

```bash
grep -rn "from.*DashboardScreen\|from.*AnalyticsTab\|from.*TabStrip" /Users/andreevxdr/sources/survey-app/frontend/src
```

There should be NO results outside the folders themselves. If there are, fix them by removing those imports.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/router.tsx \
        frontend/src/routes/dashboard/MyPollsTab/MyPollsTab.tsx \
        frontend/src/routes/dashboard/PollListItem/hooks/usePollListItem.ts && \
git commit -m "$(cat <<'EOF'
feat(frontend): switch /dashboard area to DashboardShell layout

Move /dashboard/* under a single DashboardShell route element with
RequireAuth. Add new nested routes for /dashboard/all-users (admin)
and the previously top-level /polls/new, /polls/:id/edit,
/polls/:id/analytics (now nested under /dashboard for shell wrap).
Top-level redirects preserve old URLs. Internal links in MyPollsTab
and PollListItem updated to the new paths.

Spec: docs/superpowers/specs/2026-05-27-dashboard-shell-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Delete obsolete code

**Files:**
- Delete: `frontend/src/routes/dashboard/DashboardScreen/` (entire folder)
- Delete: `frontend/src/routes/dashboard/AnalyticsTab/` (entire folder)
- Delete: `frontend/src/components/primitives/TabStrip/` (entire folder)

- [ ] **Step 1: Sanity-grep to confirm nothing else references the soon-to-be-deleted modules**

```bash
grep -rn "from.*['\"].*DashboardScreen\|from.*['\"].*AnalyticsTab\|from.*['\"].*TabStrip" /Users/andreevxdr/sources/survey-app/frontend/src
```

Expected: only matches INSIDE the three folders themselves (their own internal imports). If anything outside references them, stop and report — Task 4 missed an import.

Also check `useSystemAnalytics`:

```bash
grep -rn "useSystemAnalytics" /Users/andreevxdr/sources/survey-app/frontend/src
```

Expected: only the definition in `api/queries/admin.ts` and the import in `AnalyticsTab/`. The hook becomes unused after deletion — leave it in `admin.ts` for now (no harm, may be useful for a future system page).

- [ ] **Step 2: Delete the three folders**

```bash
cd /Users/andreevxdr/sources/survey-app && \
rm -rf frontend/src/routes/dashboard/DashboardScreen \
       frontend/src/routes/dashboard/AnalyticsTab \
       frontend/src/components/primitives/TabStrip
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add -A frontend/src/routes/dashboard/DashboardScreen \
        frontend/src/routes/dashboard/AnalyticsTab \
        frontend/src/components/primitives/TabStrip && \
git commit -m "$(cat <<'EOF'
chore(frontend): delete obsolete DashboardScreen, AnalyticsTab, TabStrip

These were the per-tab header + admin Analytics view + tab strip
primitive used by the previous /dashboard chrome. The new
DashboardShell replaces them: title/subtitle live in TopBar, the
admin Analytics system-aggregates view is deprecated per the design
choice, and the sidebar nav replaces the tab strip.

Spec: docs/superpowers/specs/2026-05-27-dashboard-shell-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Routes table from spec → Task 4 router.tsx. Sidebar Workspace+Staff sections → Task 1 Sidebar.tsx (lines 24+33). Sidebar items My polls + All users (admin) → Task 1 Sidebar.tsx. Top bar title/subtitle per pathname → Task 2 useTopBarMeta.ts. `+ New poll` only on `/dashboard` → Task 2 useTopBarMeta `showNewPollButton: true` only in the default branch + TopBarActions consumes it. Bell + Help visual-only buttons → Task 2 TopBarActions. AvatarMenu with Sign out only → Task 2 AvatarMenu. `useAdminUsers` count for All users subtitle → Task 2 `enabled` param + useTopBarMeta. Redirects → Task 4 router.tsx. `MyPollsTab.tsx` link update → Task 4 Step 2. `PollListItem` paths → Task 4 Step 3. Component deletions → Task 5.
- **Placeholder scan:** No "TBD", no "add appropriate error handling", no "similar to Task N". All steps have complete code blocks or exact commands.
- **Type consistency:** `TopBarMeta` interface in Task 2 has `{ title, subtitle, showNewPollButton }`. Consumed in `TopBar.tsx` (Task 2 Step 5) and `TopBarActions.tsx` (Task 2 Step 4) with matching destructuring. `SidebarItemProps` defined in Task 1 Step 2 and used by Task 1 Step 4 — same prop names. `DashboardShell` imports `Sidebar` and `TopBar` from their folder `index.ts` re-exports (Task 1 Step 5, Task 2 Step 6).
- **No test code in the plan** — per the project's deferred-tests preference. Verification is `tsc --noEmit` after each task + final manual smoke (handled by controller, not a subagent task).
