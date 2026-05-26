# Unified dashboard design

Date: 2026-05-27
Supersedes the routing/admin-shell portion of [2026-05-26-survey-app-design.md](2026-05-26-survey-app-design.md).

## Motivation

The original spec said "Admins see the same `/dashboard` as users. The admin shell exists only as a layout for admin management pages." That intent was misimplemented: `AdminLayout` ships with its own dark sidebar at `/admin/users` and `/admin/analytics`, reached via an "Admin Panel" button on the dashboard. The result reads as a second, parallel surface — an "admin panel" alongside the dashboard — which is not what we want.

This spec collapses both into one signed-in surface: `/dashboard`. Admin-only features become nested tabs on that surface, gated by role.

## Goals

- One signed-in shell (`MainLayout`).
- One entry URL for everything an authenticated user does day-to-day: `/dashboard`.
- Admin management features (`Users`, `System Analytics`) live as nested tabs on `/dashboard`, visible only to admins.
- Non-admin experience on `/dashboard` is visually unchanged from today (no tab strip, same header, same body).
- Old `/admin/users` and `/admin/analytics` URLs continue to work via redirect, so existing bookmarks and the in-tree e2e tests keep functioning until updated.

## Non-goals

- No new design language. We reuse existing primitives. The admin sidebar artwork (`design/AdminScreens.jsx`) is dropped from the live product; the design file stays in the repo as a reference.
- No backend changes. The `/admin/*` API endpoints, guards, and roles are untouched.
- No change to auth behavior, RBAC semantics, or token handling.

## Architecture

### Route tree

```
MainLayout                                            (public + shared chrome)
├── /                          LandingScreen
├── /login                     LoginScreen
├── /register                  RegisterScreen
├── /p/:slug                   PollScreen (public)
│
├── RequireAuth
│   ├── /dashboard             DashboardScreen        (nested route shell)
│   │   ├── (index)            MyPollsTab             (all authenticated users)
│   │   ├── /users             RequireAdmin > UsersTab
│   │   └── /analytics         RequireAdmin > AnalyticsTab
│   ├── /polls/new             PollFormScreen
│   ├── /polls/:id/edit        PollFormScreen
│   └── /polls/:id/analytics   OwnerAnalyticsScreen
│
└── redirects (no auth required, declared before catch-all)
    ├── /admin                 → /dashboard
    ├── /admin/users           → /dashboard/users
    └── /admin/analytics       → /dashboard/analytics
```

`AdminLayout` and the top-level `RequireAdmin` route group are deleted. `RequireAdmin` itself stays — it now wraps individual nested tab routes.

### `DashboardScreen` becomes a shell

Today `DashboardScreen` directly renders the polls list. After this change it becomes a thin shell:

```
<section>
  <header>
    <h1>{activeTabTitle}</h1>
    <p>Welcome back, {user.name}</p>            // only on MyPollsTab
    {activeTab === 'mine' && <CreatePollCTA />} // only on MyPollsTab
  </header>

  {isAdmin && <TabStrip tabs={['mine','users','analytics']} active={...} />}

  <Outlet />   // renders MyPollsTab | UsersTab | AnalyticsTab
</section>
```

Non-admins see no `TabStrip` (single visible tab → strip suppressed), so their dashboard looks identical to today.

### Tab components

- `routes/dashboard/MyPollsTab.tsx` — extracted from current `DashboardScreen` body (the `useMyPolls`, list rendering, delete-confirm dialog). No behavior change.
- `routes/dashboard/UsersTab.tsx` — moved from `routes/admin/users/UsersScreen.tsx`. Drops any chrome that assumed `AdminLayout`'s `AdminHeader` was wrapping it; renders its own section header inline if needed.
- `routes/dashboard/AnalyticsTab.tsx` — moved from `routes/admin/analytics/SystemAnalyticsScreen.tsx`. Same chrome cleanup as UsersTab.

The data layer (queries, mutations, API client) is unchanged; only the component file location and outer chrome move.

### `TabStrip` component

Lightweight, three options. The implementation is small enough to inline once or live in `components/primitives/TabStrip.tsx`. It renders `<NavLink>`s so the active state comes from the URL, not local React state — bookmarks and refresh work.

The strip is not rendered if only one tab is visible (i.e. non-admin).

### Deletions

- `frontend/src/layouts/AdminLayout/` — directory, including the dark sidebar.
- `frontend/src/routes/admin/` — directory; contents move under `routes/dashboard/`.
- The "Admin Panel" link/button block in `DashboardScreen.tsx` (added in commit d6f87eb).

### Redirects

Implemented as plain react-router route entries (`element: <Navigate to="/dashboard/users" replace />`), declared inside `MainLayout`'s children list above the `*` catch-all so they win the match. Public — the destination's own `RequireAuth` / `RequireAdmin` still decides what happens for an unauthenticated or non-admin visitor.

## Page title and header behavior

The current `<h1>Dashboard</h1>` is replaced by per-tab titles:

| Tab        | Title       | Subtitle                          | Header CTA      |
|------------|-------------|-----------------------------------|-----------------|
| mine       | My polls    | Welcome back, {user.name}.        | Create poll     |
| users      | Users       | (none)                            | (none)          |
| analytics  | Analytics   | (none)                            | (none)          |

The header lives in `DashboardScreen` and reads `useLocation()` (or the matched route) to pick title/subtitle/CTA. Tab components themselves render only their body content.

## Tests

- The e2e test from commit cb63e5d navigates to `/admin/users` after promoting a user. Update those URLs to `/dashboard/users` and `/dashboard/analytics` (the redirects would keep the test green, but the test should reflect the canonical URL).
- Unit tests for `RequireAdmin` (if any) are unaffected — the guard is unchanged.
- Add a smoke test that a non-admin visiting `/dashboard/users` is redirected by `RequireAdmin` (already its existing behavior).
- Add an e2e or unit test that the `TabStrip` is not rendered for a non-admin user on `/dashboard`.

## Docs

- Update `2026-05-26-survey-app-design.md`:
  - Routing table (lines ~452-466): replace the `<RequireAdmin>` block with the nested-tab structure above.
  - Line 468 ("Admin Panel button…"): delete.
  - Line 34 (out-of-scope note) keeps its first sentence (admin "system dashboard" stats page still out of scope); the rest of the bullet is now redundant with this spec — remove it and link here instead.
- Update `2026-05-26-analytics-and-admin.md` plan with a pointer that the admin surface shipped as nested tabs on `/dashboard`, not as `AdminLayout`.

## Acceptance criteria

1. `/dashboard` for a regular user is visually and functionally identical to today (same header, same polls list, same "Create poll" CTA, no tab strip).
2. `/dashboard` for an admin shows a tab strip with `My polls | Users | Analytics`. Default tab is `My polls`.
3. `/dashboard/users` for an admin renders the users management table (current `UsersScreen` behavior).
4. `/dashboard/analytics` for an admin renders the system analytics view (current `SystemAnalyticsScreen` behavior).
5. A non-admin visiting `/dashboard/users` or `/dashboard/analytics` is redirected by `RequireAdmin` (existing behavior, applied per-tab).
6. `/admin/users` and `/admin/analytics` redirect to their `/dashboard/*` counterparts.
7. No reference to `AdminLayout` remains in the frontend source tree.
8. No "Admin Panel" link is rendered on `/dashboard`.
9. Existing e2e tests pass after URL updates.

## Out of scope

- The admin "system dashboard" stats page from `design/AdminScreens.jsx` (`AdminDashboard` component). Still deferred.
- Polls and System nav items from the design kit's admin sidebar. Still deferred.
- Any backend route or guard changes.
- Any visual redesign of the dashboard, header, or polls list.
