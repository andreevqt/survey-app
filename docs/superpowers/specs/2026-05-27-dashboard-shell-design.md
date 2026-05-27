# Dashboard shell + routing — design (Spec 1 of 3)

**Date:** 2026-05-27
**Scope:** Frontend only. New shell layout for the dashboard area. Routing changes.
**Decomposition:** Part of a 3-spec sequence to align the dashboard with the canonical design in [`design/Polls App.html`](../../../design/Polls%20App.html). Spec 1 establishes the shell; Spec 2 adds the polls table, modals, and ⌘K search; Spec 3 adds the Settings modal.
**Supersedes parts of:** [`2026-05-27-dashboard-header-restyle-design.md`](2026-05-27-dashboard-header-restyle-design.md). The `Welcome back, {name}` header text and `Create Poll` CTA from that spec are kept conceptually but move into the new top bar. The `DashboardScreen` and `useDashboardScreen` components are deleted.

## Problem

The current `/dashboard` page renders a single screen with a `TabStrip` for admin sub-views and a constant header. The canonical design uses a two-column shell: sticky 248px sidebar on the left, sticky 64px top bar across the main column, with sidebar items that act as routes. The current shape diverges substantially from the design.

## Goal

Land the shell layout from the design so that all `/dashboard/*` routes render inside it, with a sidebar nav (Workspace / Staff sections), per-tab title and subtitle in the top bar, and a contextual `+ New poll` action in the top right. Existing tab content (My polls card list, Users table, create/edit/analytics pages) is reused without changes — only the surrounding chrome moves.

## Non-goals (deferred)

These will be addressed in Spec 2 or Spec 3:

- Polls table with bulk-select + Export CSV (replaces card list) — **Spec 2**
- Routed modals for create / edit / per-poll analytics (replaces the nested page renders here) — **Spec 2**
- ⌘K search input in the sidebar — **Spec 2**
- `All polls` sidebar item + `GET /api/v1/admin/polls` backend endpoint — **Spec 2**
- `Workspace > Analytics` sidebar item — dropped permanently (per-poll analytics modal in Spec 2 is the only entry point)
- `Staff > System` sidebar item — dropped permanently
- System-wide aggregate analytics (current `/dashboard/analytics` content: total users / total polls / total responses) — dropped permanently
- Settings modal (`Your profile` / `Settings` / appearance / password / email prefs / danger zone) — **Spec 3**
- Backend changes — none in Spec 1
- `MainLayout` / `Header.tsx` consolidation — leave wrapping only `/p/:slug` for now; future cleanup

## Design

### Routes

After Spec 1 lands:

| Path | Component tree | Notes |
|---|---|---|
| `/` | `LandingScreen` | unchanged |
| `/login` | `LoginScreen` | unchanged |
| `/register` | `RegisterScreen` | unchanged |
| `/p/:slug` | `MainLayout` + `PollScreen` | unchanged |
| `/dashboard` | `DashboardLayout` (with `RequireAuth`) + `DashboardShell` + `MyPollsTab` | card list unchanged |
| `/dashboard/all-users` | above + `RequireAdmin` + `UsersTab` | renamed from `/dashboard/users` |
| `/dashboard/polls/new` | above + `PollFormScreen` | existing form, nested under shell |
| `/dashboard/polls/:id/edit` | above + `PollFormScreen` | existing form, nested |
| `/dashboard/polls/:id/analytics` | above + `OwnerAnalyticsScreen` | existing per-poll analytics, nested |

**Redirects** (using `<Navigate replace />`):

- `/polls/new` → `/dashboard/polls/new`
- `/polls/:id/edit` → `/dashboard/polls/:id/edit`
- `/polls/:id/analytics` → `/dashboard/polls/:id/analytics`
- `/dashboard/users` → `/dashboard/all-users`
- `/dashboard/analytics` → `/dashboard`
- `/admin`, `/admin/users`, `/admin/analytics` — existing redirects updated to point to the new paths

### Components — new

All under `frontend/src/layouts/DashboardShell/`:

- **`DashboardShell/DashboardShell.tsx`** — two-column flex layout: `<Sidebar />`, then a column with `<TopBar />` + `<Outlet />`. Reads `useAuth()` once, passes `user` down to children.
- **`Sidebar/Sidebar.tsx`** — left rail. Width 248px, `sticky top-0 h-screen`, white background with `border-r`. Renders the brand mark + name + role chip, then `<SidebarSection label="Workspace">…</SidebarSection>` and (for admins) `<SidebarSection label="Staff">…</SidebarSection>`.
- **`Sidebar/SidebarSection.tsx`** — uppercase tracking-wide label + list of items.
- **`Sidebar/SidebarItem.tsx`** — `NavLink` wrapper with `active` styling (indigo-50 background + indigo-700 text when current).
- **`TopBar/TopBar.tsx`** — sticky 64px white bar with `border-b z-10`. Left: title + subtitle from `useTopBarMeta()`. Right: `<TopBarActions />`.
- **`TopBar/TopBarActions.tsx`** — conditional `+ New poll` button (only on `/dashboard`; this is the My polls tab and the only place in Spec 1 where the action makes sense — `/dashboard/all-polls` will add another in Spec 2) → links to `/dashboard/polls/new`. Always: visual-only bell icon button (with red dot) and help icon button (both `aria-label`'d, both no-op `onClick`). Then `<AvatarMenu />`.
- **`TopBar/AvatarMenu.tsx`** — avatar circle + chevron. Clicking opens a small menu below it; only item in Spec 1 is **Sign out** (calls `useAuth().signOut()`). Profile + Settings items added in Spec 3.
- **`TopBar/hooks/useTopBarMeta.ts`** — pathname → `{ title, subtitle }`:
  - `/dashboard` → `{ title: 'My polls', subtitle: \`Welcome back, ${user.name}\` }`
  - `/dashboard/all-users` → `{ title: 'All users', subtitle: \`${totalUsers} total users\` }` — `totalUsers` comes from the existing `useAdminUsers()` hook in `frontend/src/api/queries/admin.ts`, which already returns a `total` field on the response. Subtitle reads from `data?.total`; falls back to plain `All users` (no count) while loading.
  - `/dashboard/polls/new` → `{ title: 'New poll', subtitle: 'Build your poll and publish when ready.' }`
  - `/dashboard/polls/:id/edit` → `{ title: 'Edit poll', subtitle: pollTitle }` — `pollTitle` from React Query cache for that poll; falls back to a generic subtitle while loading.
  - `/dashboard/polls/:id/analytics` → `{ title: 'Analytics', subtitle: pollTitle }`
  - Default: `{ title: 'Dashboard', subtitle: undefined }`

### Components — deleted

- `frontend/src/routes/dashboard/DashboardScreen/` (entire folder)
- `frontend/src/routes/dashboard/AnalyticsTab/` (system analytics — deprecated)
- `frontend/src/components/primitives/TabStrip/` — no longer used after the shell lands. Check for other consumers before deletion (none expected based on a `grep`).

### Components — renamed / moved

- `UsersTab` stays at `frontend/src/routes/dashboard/UsersTab/` but the route mounting it changes from `/dashboard/users` to `/dashboard/all-users`. No internal changes.
- `MyPollsTab` stays put. The `Welcome back` subtitle inside `MyPollsTab` is removed (it now lives in `TopBar`). The empty-state card and its `Create Poll` button stay; the button still navigates to `/polls/new` style URL — the URL gets updated to `/dashboard/polls/new` and the page renders inside the shell.

### Layout hierarchy (`router.tsx`)

```
- /                          → LandingScreen
- /login                     → LoginScreen
- /register                  → RegisterScreen

- element: <MainLayout />
  - /p/:slug                 → PollScreen

- element: <DashboardLayout /> = <RequireAuth><DashboardShell /></RequireAuth>
  - /dashboard               → MyPollsTab           (index)
  - /dashboard/all-users     → <RequireAdmin><UsersTab /></RequireAdmin>
  - /dashboard/polls/new     → PollFormScreen
  - /dashboard/polls/:id/edit       → PollFormScreen
  - /dashboard/polls/:id/analytics  → OwnerAnalyticsScreen

- redirects (Navigate elements at top level):
  - /polls/new                → /dashboard/polls/new
  - /polls/:id/edit           → /dashboard/polls/:id/edit
  - /polls/:id/analytics      → /dashboard/polls/:id/analytics
  - /dashboard/users          → /dashboard/all-users
  - /dashboard/analytics      → /dashboard
  - /admin                    → /dashboard
  - /admin/users              → /dashboard/all-users
  - /admin/analytics          → /dashboard

- *                          → /
```

### Data flow

1. `DashboardShell` calls `useAuth()` once. If `user.role === 'ADMIN'`, the sidebar renders the Staff section.
2. `TopBar` calls `useTopBarMeta()` which reads `useLocation()` and uses route-matching utilities to derive `{ title, subtitle }`.
3. For dynamic subtitles (`all-users` total count, poll title for edit/analytics), `useTopBarMeta` calls existing React Query hooks. While loading, falls back to a generic subtitle so the UI doesn't flicker.
4. Sidebar items use `NavLink` with `end` where appropriate (My polls is `end` so it doesn't stay active when on `/dashboard/polls/new`).

### Styling

Tailwind utilities only — no new global CSS. Concrete layout (top-down):

```tsx
<div className="flex min-h-screen bg-gray-50">
  <Sidebar />                                                 // sticky top-0 h-screen w-[248px] ...
  <div className="flex-1 flex flex-col min-w-0">              // main column, takes remaining width
    <TopBar />                                                // sticky top-0 z-10 h-16 ...
    <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
      <Outlet />
    </main>
  </div>
</div>
```

Concrete class strings:

- Shell container: `flex min-h-screen bg-gray-50`
- Sidebar: `sticky top-0 h-screen w-[248px] shrink-0 bg-white border-r border-gray-200 flex flex-col`
- Top bar: `sticky top-0 z-10 h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4`
- Main column wrapper: `flex-1 flex flex-col min-w-0`
- Main content: `flex-1 px-8 py-7 max-w-7xl mx-auto w-full`
- Sidebar item (active): `bg-indigo-50 text-indigo-700 font-medium`
- Sidebar item (idle): `text-gray-700 hover:bg-gray-50`

The top bar spans the full main-column width (no max-width constraint on it); only the body content is centered at `max-w-7xl`.

**Brand mark** in the sidebar header uses the inline SVG from the design HTML at lines 2144–2154 of `design/Polls App.html` (indigo rounded square with three rows of dots/bars). Copy the SVG markup into a `BrandMark.tsx` component under `Sidebar/`.

### Accessibility

- Sidebar is `<nav aria-label="Primary">`. Sections use `<h2>` for the "Workspace" / "Staff" labels (visually small uppercase, semantically headers).
- Sidebar items are real `<a>` (from `NavLink`).
- Top bar bell + help buttons have `aria-label="Notifications"` and `aria-label="Help"` and `disabled` removed — they are interactive (but currently no-op).
- Avatar dropdown is keyboard-accessible: trigger is `<button aria-haspopup="menu" aria-expanded>`; menu is `<ul role="menu">` with `<li role="menuitem">`. Escape closes; click-outside closes.
- Sticky top bar must not trap focus for keyboard users.

## Verification

After implementation, on a local dev server:

1. As a non-admin user, visit `/dashboard`. Confirm:
   - Sidebar shows brand + Workspace section with only **My polls** (active).
   - Top bar reads `My polls` / `Welcome back, {name}`. `+ New poll` button visible.
   - Existing card list renders below.
2. As an admin user, visit `/dashboard`, then click **All users** in the sidebar.
   - URL becomes `/dashboard/all-users`.
   - Sidebar marks All users active.
   - Top bar reads `All users` / `{N} total users`.
   - No `+ New poll` button.
   - Existing users table renders.
3. Click `+ New poll` from My polls → URL becomes `/dashboard/polls/new` and the existing `PollFormScreen` renders inside the shell. Sidebar still visible. Top bar title becomes `New poll`.
4. Manually visit `/polls/new` → redirected to `/dashboard/polls/new`. Same for `/polls/:id/edit`, `/polls/:id/analytics`, `/dashboard/users`, `/dashboard/analytics`, `/admin*`.
5. Open avatar dropdown → only **Sign out** item visible. Click → signed out, redirected to `/login`.
6. Verify `/p/:slug` still works for anonymous poll-taking (uses `MainLayout`, not shell).
7. `npm run check:ts` passes. `npm run lint` (broken project-wide due to missing eslint config — pre-existing) skipped.

## Risks

- **Layout regression on `/p/:slug`** — out of scope but adjacent. Smoke-check after the change.
- **Old commits** (`f90219f`, `4ac2c1a`) introduced a constant header that this spec deletes. Net change is fine but git history will show the back-and-forth.
- **`TabStrip` removal** — if any other route uses it (none expected), keep it. Run `grep -rn TabStrip frontend/src` as part of the plan.
- **Top-bar dynamic subtitle for `/dashboard/polls/:id/edit`** — depends on React Query cache hit. If user lands there cold (no prefetch), subtitle shows generic text for ~200ms. Acceptable.
- **Sticky positioning + max-width main column** — interaction between sticky top bar and centered content can cause horizontal scroll on narrow screens. The design uses `max-width: 1200px` and the top bar spans full main-column width. Confirm during smoke test.
