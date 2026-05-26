# Unified Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the separate `AdminLayout` admin panel into the single `/dashboard` surface, with admin features (Users, System Analytics) appearing as `RequireAdmin`-gated nested tabs.

**Architecture:** `DashboardScreen` becomes a thin nested-route shell that renders a tab strip (admins only) and an `<Outlet />`. The current polls-list body extracts to a `MyPollsTab`. Admin screens move from `routes/admin/*` to `routes/dashboard/*` as `UsersTab`/`AnalyticsTab`, lose their `AdminLayout` chrome, and gain inline section headers. `AdminLayout` and `routes/admin/` are deleted. Old `/admin/*` URLs become `<Navigate>` redirects to the new `/dashboard/*` paths.

**Tech Stack:** React 18, TypeScript, react-router-dom v6 (nested routes, `Outlet`, `NavLink`, `Navigate`), TanStack Query, Tailwind utility classes, Playwright for e2e.

**Spec:** [docs/superpowers/specs/2026-05-27-unified-dashboard-design.md](../specs/2026-05-27-unified-dashboard-design.md)

**Process note:** TDD is intentionally skipped on this project (see memory `feedback_defer_tdd.md`). Tasks are ordered "implement → verify → commit." The existing e2e suite (`frontend/e2e/admin.spec.ts`) is updated in Task 7 to reflect the new URLs; no new tests are written.

---

## File map

**Created:**
- `frontend/src/components/primitives/TabStrip.tsx` — small `NavLink`-based tab strip used by `DashboardScreen` (Task 1).
- `frontend/src/routes/dashboard/MyPollsTab.tsx` — the polls-list body extracted from today's `DashboardScreen` (Task 2).
- `frontend/src/routes/dashboard/UsersTab.tsx` — moved from `routes/admin/users/UsersScreen.tsx`, AdminHeader stripped (Task 3).
- `frontend/src/routes/dashboard/AnalyticsTab.tsx` — moved from `routes/admin/analytics/SystemAnalyticsScreen.tsx`, AdminHeader stripped (Task 3).

**Modified:**
- `frontend/src/routes/dashboard/DashboardScreen.tsx` — becomes shell: header + tab strip + `<Outlet />` (Task 4).
- `frontend/src/router.tsx` — nest admin routes under `/dashboard`, add `/admin/*` → `/dashboard/*` redirects, remove `AdminLayout` group (Task 5).
- `frontend/src/layouts/MainLayout/Header.tsx` — remove the `Admin Panel` link block (Task 6).
- `frontend/e2e/admin.spec.ts` — update assertions and selectors for the new URL and the absence of "Admin Panel" link (Task 7).
- `docs/superpowers/specs/2026-05-26-survey-app-design.md` — update the routing table and the out-of-scope note to point to the new spec (Task 8).
- `docs/superpowers/plans/2026-05-26-analytics-and-admin.md` — append a pointer to the new spec (Task 8).

**Deleted:**
- `frontend/src/layouts/AdminLayout/` (whole directory: `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`) (Task 5).
- `frontend/src/routes/admin/` (whole directory: `users/UsersScreen.tsx`, `users/UsersTable.tsx`, `analytics/SystemAnalyticsScreen.tsx`) (Tasks 3 & 5).

`UsersTable.tsx` moves alongside `UsersTab.tsx` into `routes/dashboard/` (Task 3). The data layer (`api/queries/admin.ts`, `api/mutations/admin.ts`, `api/schema.ts`) is unchanged — backend endpoints are still `/admin/*`.

---

## Task 1: TabStrip primitive

**Files:**
- Create: `frontend/src/components/primitives/TabStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

Notes:
- `tabs.length < 2` → render nothing. Lets the caller pass a one-item array for non-admins without conditional plumbing.
- `end` is needed on the index tab (`/dashboard`) so it doesn't match `/dashboard/users` etc. The caller sets it.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/primitives/TabStrip.tsx
git commit -m "feat(frontend): add TabStrip primitive for nested-route tabs"
```

---

## Task 2: Extract MyPollsTab

**Files:**
- Create: `frontend/src/routes/dashboard/MyPollsTab.tsx`
- Reference (do not modify yet): `frontend/src/routes/dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Create `MyPollsTab.tsx` with the current polls-list body**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMyPolls } from '../../api/queries/polls';
import { useDeletePoll } from '../../api/mutations/polls';
import { Card } from '../../components/primitives/Card';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { PollListItem } from './PollListItem';

export function MyPollsTab() {
  const polls = useMyPolls();
  const del = useDeletePoll();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <div className="mt-8">
      {polls.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : polls.isError ? (
        <Card className="text-center">
          <p className="text-sm text-red-600">Could not load polls.</p>
        </Card>
      ) : !polls.data || polls.data.items.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first poll to start collecting responses.</p>
          <Link to="/polls/new"><Button className="mt-4">Create poll</Button></Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {polls.data.items.map((p) => (
            <PollListItem key={p.id} poll={p} onDelete={setPendingDeleteId} />
          ))}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this poll?"
          body="The poll and all its responses will be permanently removed."
          confirmLabel="Delete"
          isPending={del.isPending}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() =>
            del.mutate(pendingDeleteId, {
              onSuccess: () => {
                setPendingDeleteId(null);
                toast.success('Poll deleted');
              },
              onError: () => toast.error('Could not delete poll'),
            })
          }
        />
      )}
    </div>
  );
}
```

Note: identical to today's `DashboardScreen` body minus the `<h1>` and "Create poll" header CTA (those move into `DashboardScreen` itself in Task 4). The empty-state card keeps its own "Create poll" link — that's part of the empty-state UI, not the page header.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors. (The new file is not yet imported anywhere, so this should be a clean check.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/MyPollsTab.tsx
git commit -m "feat(frontend): extract MyPollsTab from DashboardScreen body"
```

---

## Task 3: Move admin screens to dashboard tabs

**Files:**
- Create: `frontend/src/routes/dashboard/UsersTab.tsx`
- Create: `frontend/src/routes/dashboard/UsersTable.tsx`
- Create: `frontend/src/routes/dashboard/AnalyticsTab.tsx`
- Delete: `frontend/src/routes/admin/users/UsersScreen.tsx`
- Delete: `frontend/src/routes/admin/users/UsersTable.tsx`
- Delete: `frontend/src/routes/admin/analytics/SystemAnalyticsScreen.tsx`

- [ ] **Step 1: Move `UsersTable.tsx` and fix relative imports**

```bash
git mv frontend/src/routes/admin/users/UsersTable.tsx frontend/src/routes/dashboard/UsersTable.tsx
```

Then open `frontend/src/routes/dashboard/UsersTable.tsx`. Any import that previously climbed `../../../` to reach `api/`, `components/`, `lib/`, etc. must drop one `..` segment because the file is now one directory shallower. Examples to look for and rewrite:

- `'../../../api/...'` → `'../../api/...'`
- `'../../../components/...'` → `'../../components/...'`
- `'../../../lib/...'` → `'../../lib/...'`
- `'../../../auth/...'` → `'../../auth/...'`

Do not change any non-relative imports.

- [ ] **Step 2: Create `UsersTab.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { useAdminUsers } from '../../api/queries/admin';
import { useBulkDeleteUsers } from '../../api/mutations/admin';
import { UsersTable } from './UsersTable';
import { downloadCsv } from '../../lib/download-csv';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export function UsersTab() {
  const usersQ = useAdminUsers();
  const bulkDelete = useBulkDeleteUsers();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => {
    if (!usersQ.data) return;
    const all = usersQ.data.items.map((u) => u.id);
    setSelected((p) => (p.length === all.length ? [] : all));
  };

  const confirmDelete = () => {
    bulkDelete.mutate(selected, {
      onSuccess: (r) => {
        toast.success(`Deleted ${r.count} user${r.count === 1 ? '' : 's'}`);
        setSelected([]);
        setConfirming(false);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Bulk delete failed');
        setConfirming(false);
      },
    });
  };

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadCsv(`${API_BASE}/admin/users/export.csv`)}
        >
          Export CSV
        </Button>
      </div>

      {selected.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-indigo-50 border border-indigo-100 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {selected.length} user{selected.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelected([])}>Clear</Button>
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
              Delete selected
            </Button>
          </div>
        </div>
      )}
      {usersQ.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : usersQ.isError || !usersQ.data ? (
        <p className="text-sm text-red-600">Could not load users.</p>
      ) : (
        <UsersTable
          users={usersQ.data.items}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.length} user${selected.length === 1 ? '' : 's'}?`}
          body="This will permanently delete the selected accounts and all their polls."
          confirmLabel="Delete"
          isPending={bulkDelete.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
```

Differences from the old `UsersScreen`:
- No `AdminHeader` import or render (the title is now rendered by `DashboardScreen` based on the active route).
- No outer `<p className="p-6 max-w-5xl">` wrapper — `DashboardScreen` already pads the tab content section. The "Export CSV" button gets its own flex row at the top.
- Import paths use two `..` segments instead of three.

- [ ] **Step 3: Create `AnalyticsTab.tsx`**

```tsx
import { Card } from '../../components/primitives/Card';
import { Spinner } from '../../components/primitives/Spinner';
import { useSystemAnalytics } from '../../api/queries/admin';

function Stat({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card size="sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}

export function AnalyticsTab() {
  const q = useSystemAnalytics();
  return (
    <div className="mt-6">
      {q.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : q.isError || !q.data ? (
        <p className="text-sm text-red-600">Could not load system analytics.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat title="Total users" value={q.data.totalUsers} hint={`${q.data.totalAdmins} admin${q.data.totalAdmins === 1 ? '' : 's'}`} />
          <Stat title="Total polls" value={q.data.totalPolls} hint={`${q.data.activePolls} active`} />
          <Stat title="Total responses" value={q.data.totalResponses} />
        </div>
      )}
    </div>
  );
}
```

Differences from old `SystemAnalyticsScreen`:
- No `AdminHeader` (title rendered by `DashboardScreen`).
- No outer `<p className="p-6 max-w-5xl">` (parent handles spacing).
- Import paths trimmed.

- [ ] **Step 4: Delete the old admin screens**

```bash
git rm frontend/src/routes/admin/users/UsersScreen.tsx
git rm frontend/src/routes/admin/analytics/SystemAnalyticsScreen.tsx
```

The empty `routes/admin/` subdirectories will be removed by git automatically once their last tracked file is gone.

- [ ] **Step 5: Type-check (some errors expected here)**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors in `frontend/src/router.tsx` because it still imports `UsersScreen` and `SystemAnalyticsScreen` from the deleted paths. These will be fixed in Task 5. Other files should compile cleanly.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/dashboard/UsersTab.tsx \
        frontend/src/routes/dashboard/AnalyticsTab.tsx \
        frontend/src/routes/dashboard/UsersTable.tsx \
        frontend/src/routes/admin/users/UsersScreen.tsx \
        frontend/src/routes/admin/analytics/SystemAnalyticsScreen.tsx
git commit -m "feat(frontend): move admin screens to dashboard tabs"
```

(The `git rm` from Step 4 and `git mv` from Step 1 already staged the deletions/renames; this `git add` covers the new files and is a no-op for the removals.)

---

## Task 4: Convert DashboardScreen into a tab shell

**Files:**
- Modify: `frontend/src/routes/dashboard/DashboardScreen.tsx` (full rewrite)

- [ ] **Step 1: Rewrite DashboardScreen**

Replace the entire contents of `frontend/src/routes/dashboard/DashboardScreen.tsx` with:

```tsx
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';
import { TabStrip, type TabStripItem } from '../../components/primitives/TabStrip';
import { useAuth } from '../../auth/useAuth';

type TabMeta = { title: string; subtitle?: string; showCreateCta: boolean };

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

export function DashboardScreen() {
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

  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{meta.title}</h1>
          {meta.subtitle && <p className="mt-1 text-sm text-gray-600">{meta.subtitle}</p>}
        </div>
        {meta.showCreateCta && (
          <Link to="/polls/new"><Button>Create poll</Button></Link>
        )}
      </div>

      <div className="mt-6">
        <TabStrip tabs={tabs} />
      </div>

      <Outlet />
    </section>
  );
}
```

Behavior:
- Title/subtitle/CTA come from `tabMetaForPath`, which keys off the URL.
- `TabStrip` returns `null` when fewer than two tabs (Task 1) — so non-admins see nothing where the strip would render.
- `max-w-4xl` is preserved from the original. `UsersTab`/`AnalyticsTab` previously used `max-w-5xl`; under the new shell they inherit the dashboard's narrower `max-w-4xl`. This is acceptable per spec (admin tabs sit inside the dashboard shell), and the existing tables already scroll/wrap on narrower widths.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: same router-related errors as Task 3 Step 5 (router still imports old paths). No new errors from the shell file itself.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/DashboardScreen.tsx
git commit -m "feat(frontend): convert DashboardScreen to nested-tab shell"
```

---

## Task 5: Wire up router and delete AdminLayout

**Files:**
- Modify: `frontend/src/router.tsx` (full rewrite)
- Delete: `frontend/src/layouts/AdminLayout/AdminLayout.tsx`
- Delete: `frontend/src/layouts/AdminLayout/AdminSidebar.tsx`
- Delete: `frontend/src/layouts/AdminLayout/AdminHeader.tsx`

- [ ] **Step 1: Rewrite `frontend/src/router.tsx`**

Replace its entire contents with:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { DashboardScreen } from './routes/dashboard/DashboardScreen';
import { MyPollsTab } from './routes/dashboard/MyPollsTab';
import { UsersTab } from './routes/dashboard/UsersTab';
import { AnalyticsTab } from './routes/dashboard/AnalyticsTab';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { PollFormScreen } from './routes/polls/PollFormScreen';
import { PollScreen } from './routes/poll/PollScreen';
import { OwnerAnalyticsScreen } from './routes/polls/analytics/OwnerAnalyticsScreen';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <LandingScreen /> },
      { path: '/login', element: <LoginScreen /> },
      { path: '/register', element: <RegisterScreen /> },
      { path: '/p/:slug', element: <PollScreen /> },

      {
        path: '/dashboard',
        element: <RequireAuth><DashboardScreen /></RequireAuth>,
        children: [
          { index: true, element: <MyPollsTab /> },
          { path: 'users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
          { path: 'analytics', element: <RequireAdmin><AnalyticsTab /></RequireAdmin> },
        ],
      },

      { path: '/polls/new', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/edit', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/analytics', element: <RequireAuth><OwnerAnalyticsScreen /></RequireAuth> },

      { path: '/admin', element: <Navigate to="/dashboard" replace /> },
      { path: '/admin/users', element: <Navigate to="/dashboard/users" replace /> },
      { path: '/admin/analytics', element: <Navigate to="/dashboard/analytics" replace /> },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```

Key differences:
- The top-level `RequireAdmin > AdminLayout` route group is gone.
- `/dashboard` becomes a parent route with three children (`index`, `users`, `analytics`). `RequireAdmin` wraps the admin children individually.
- Three `Navigate` redirects sit between the auth-required routes and the catch-all so the literal paths win the match before `*` fires.

- [ ] **Step 2: Delete AdminLayout files**

```bash
git rm frontend/src/layouts/AdminLayout/AdminLayout.tsx \
       frontend/src/layouts/AdminLayout/AdminSidebar.tsx \
       frontend/src/layouts/AdminLayout/AdminHeader.tsx
```

- [ ] **Step 3: Type-check (should pass now)**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean exit, no errors. The two router imports that previously pointed at deleted files now point at the new tab modules.

- [ ] **Step 4: Verify nothing else imports `AdminLayout`/`AdminHeader`/`AdminSidebar`**

Run: `cd frontend && grep -r --include='*.ts' --include='*.tsx' "AdminLayout\|AdminHeader\|AdminSidebar" src`
Expected: no matches. If there are matches, fix the importing file (likely just removing the import) before continuing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router.tsx \
        frontend/src/layouts/AdminLayout/AdminLayout.tsx \
        frontend/src/layouts/AdminLayout/AdminSidebar.tsx \
        frontend/src/layouts/AdminLayout/AdminHeader.tsx
git commit -m "feat(frontend): nest admin routes under /dashboard, drop AdminLayout"
```

(The `git rm` from Step 2 has already staged the deletions; `git add` here is for the modified `router.tsx`.)

---

## Task 6: Remove the Admin Panel link from MainLayout Header

**Files:**
- Modify: `frontend/src/layouts/MainLayout/Header.tsx`

- [ ] **Step 1: Open `frontend/src/layouts/MainLayout/Header.tsx` and remove the Admin Panel block**

Find this block (lines 18-25 as of commit d6f87eb):

```tsx
            {user.role === 'ADMIN' && (
              <Link
                to="/admin/users"
                className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
              >
                Admin Panel
              </Link>
            )}
```

Delete it entirely. The `<>` fragment around the authenticated-user nav stays in place; only this conditional block goes.

After the edit, the authenticated branch should start directly with the `Dashboard` link:

```tsx
        {user ? (
          <>
            <Link to="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
            <Avatar name={user.name} size="sm" />
            ...
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean. Note that `Link` is still imported and used by other links in this file — do not remove the import.

- [ ] **Step 3: Verify the link is gone**

Run: `cd frontend && grep -n "Admin Panel" src/layouts/MainLayout/Header.tsx`
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/MainLayout/Header.tsx
git commit -m "feat(frontend): drop Admin Panel link from header"
```

---

## Task 7: Update e2e admin spec

**Files:**
- Modify: `frontend/e2e/admin.spec.ts` (full rewrite)

The existing test expects an "Admin Panel" link and a `/admin/users` URL. After this change those are gone — admins use the tab strip on `/dashboard` instead. The test is rewritten to navigate via the new tabs and assert on the new canonical URLs.

- [ ] **Step 1: Replace the file contents**

```ts
import { test, expect } from '@playwright/test';

test('admin promotes a user → user sees Users tab after re-login', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-target-${id}@example.com`;

  // Register a regular user
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Target');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Regular user should NOT see a Users tab
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Open the Users tab (renders as a NavLink labelled "Users")
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL(/\/dashboard\/users/);

  // Promote E2E Target
  const targetRow = page.locator('tr', { has: page.getByText(email) });
  await targetRow.locator('select').selectOption('ADMIN');
  await expect(page.getByText('E2E Target is now ADMIN')).toBeVisible({ timeout: 5000 });

  // Fresh context: log in as the promoted user, see the Users tab now
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.getByLabel('Email').fill(email);
  await p2.getByLabel('Password').fill('hunter22!');
  await p2.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(p2).toHaveURL(/\/dashboard/);
  await expect(p2.getByRole('link', { name: 'Users' })).toBeVisible();
  await ctx.close();
});

test('legacy /admin/users URL redirects to /dashboard/users for admin', async ({ page }) => {
  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Visit the legacy URL
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/dashboard\/users/);
});
```

Two tests:
1. Full promotion flow, but via the new "Users" tab instead of the deleted "Admin Panel" link.
2. New regression test: legacy `/admin/users` URL redirects.

- [ ] **Step 2: Run the e2e suite**

Playwright tests need the backend + frontend dev servers reachable. From the repo root: `docker compose up -d` (or whatever the local convention is — `frontend/playwright.config.ts` documents the expected base URL).

Run (from `frontend/`): `npx playwright test e2e/admin.spec.ts`
(The `test:e2e` script in `frontend/package.json` runs the full suite; use the targeted path for a faster feedback loop.)
Expected: 2 passed.

If the test fails because the `Users` link selector also matches something unintended (e.g. a stray "Users" label in another component), tighten the selector to `page.getByRole('navigation').getByRole('link', { name: 'Users' })` or similar — but verify first by inspecting the failure output.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin.spec.ts
git commit -m "test(frontend): rewrite admin e2e for unified dashboard tabs"
```

---

## Task 8: Update spec docs

**Files:**
- Modify: `docs/superpowers/specs/2026-05-26-survey-app-design.md`
- Modify: `docs/superpowers/plans/2026-05-26-analytics-and-admin.md`

- [ ] **Step 1: Update the routing table in the original survey-app spec**

Open `docs/superpowers/specs/2026-05-26-survey-app-design.md`.

Replace lines around 452-466 (the routing table block) with:

```
/                              MainLayout > LandingScreen
/login                         MainLayout > LoginScreen
/register                      MainLayout > RegisterScreen
/p/:slug                       MainLayout > PollScreen (public)

<RequireAuth>
  /dashboard                   MainLayout > DashboardScreen (shell)
    (index)                    MyPollsTab
    /dashboard/users           RequireAdmin > UsersTab
    /dashboard/analytics       RequireAdmin > AnalyticsTab
  /polls/new                   MainLayout > PollFormScreen
  /polls/:id/edit              MainLayout > PollFormScreen
  /polls/:id/analytics         MainLayout > OwnerAnalyticsScreen

Legacy redirects (declared inside MainLayout, above the catch-all):
  /admin                       → /dashboard
  /admin/users                 → /dashboard/users
  /admin/analytics             → /dashboard/analytics
```

Then replace line 468 (the "Admin Panel" sentence) with:

> See [2026-05-27-unified-dashboard-design.md](2026-05-27-unified-dashboard-design.md) for the rationale behind the nested-tab layout and the removal of `AdminLayout`.

- [ ] **Step 2: Trim the out-of-scope bullet about the admin system dashboard**

Find the bullet around line 34. It currently reads roughly:

> An admin "system dashboard" stats page (the `AdminDashboard` component in the design). Admins see the same `/dashboard` as users. The admin shell exists only as a layout for admin management pages (Users, Analytics).

Replace with:

> An admin "system dashboard" stats page (the `AdminDashboard` component in the design kit) — still out of scope. The admin shell from the design kit is not used; admin features live as nested tabs on `/dashboard` (see [2026-05-27-unified-dashboard-design.md](2026-05-27-unified-dashboard-design.md)).

- [ ] **Step 3: Append a pointer to the analytics-and-admin plan**

Open `docs/superpowers/plans/2026-05-26-analytics-and-admin.md` and append at the very end (after a blank line):

```markdown

---

**2026-05-27 update:** The admin surface was reworked from a separate `AdminLayout` panel into nested tabs on `/dashboard`. See [2026-05-27-unified-dashboard-design.md](../specs/2026-05-27-unified-dashboard-design.md) and the implementation in [2026-05-27-unified-dashboard.md](2026-05-27-unified-dashboard.md).
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-26-survey-app-design.md \
        docs/superpowers/plans/2026-05-26-analytics-and-admin.md
git commit -m "docs: point original spec/plan at unified-dashboard design"
```

---

## Task 9: Manual verification

Final acceptance pass against the spec's acceptance criteria.

- [ ] **Step 1: Start the stack**

From the repo root:
```bash
docker compose up -d
```
Wait for the backend container to be healthy (it runs migrations + seed on startup). Then:
```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify as a non-admin user**

1. Register a fresh user at `/register`.
2. Land on `/dashboard`.
3. Confirm: header reads "My polls" with subtitle "Welcome back, …", "Create poll" CTA on the right.
4. Confirm: **no tab strip visible** (single tab → strip suppressed).
5. Confirm: header nav has no "Admin Panel" link.
6. Visit `/dashboard/users` directly — should redirect to `/dashboard` (via `RequireAdmin`).
7. Visit `/admin/users` directly — should redirect through to `/dashboard` (legacy redirect → RequireAdmin redirect chain).

- [ ] **Step 3: Verify as admin**

1. Sign out, sign in as `admin@polls.local` / `admin`.
2. Land on `/dashboard`.
3. Confirm: tab strip shows `My polls | Users | Analytics`, "My polls" is active.
4. Click "Users" → URL becomes `/dashboard/users`, table loads, "Export CSV" button visible, no `Welcome back` subtitle, no "Create poll" CTA.
5. Click "Analytics" → URL becomes `/dashboard/analytics`, three stat cards render.
6. Click "My polls" → returns to `/dashboard` (no trailing slash, index route).
7. Visit `/admin/users` directly → redirected to `/dashboard/users`.
8. Visit `/admin/analytics` directly → redirected to `/dashboard/analytics`.

- [ ] **Step 4: Sanity-check imports and dead code**

```bash
cd frontend
grep -r --include='*.ts' --include='*.tsx' "routes/admin\|AdminLayout\|AdminHeader\|AdminSidebar\|UsersScreen\|SystemAnalyticsScreen" src e2e
```
Expected: no matches.

- [ ] **Step 5: Run the full frontend test/typecheck suite**

```bash
cd frontend
npx tsc --noEmit
npm test
npm run test:e2e
```
Expected: typecheck clean, unit tests pass, both e2e specs pass.

- [ ] **Step 6: Nothing to commit if all previous tasks committed cleanly**

`git status` should be clean. If not, address what changed before declaring the work done.
