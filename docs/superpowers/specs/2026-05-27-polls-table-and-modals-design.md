# Polls table + routed modals + ⌘K search — design (Spec 2 of 3)

**Date:** 2026-05-27
**Scope:** Frontend + minimal backend addition. Replaces the My polls card list with the design's `AdminPollsTable`, adds an admin **All polls** tab and its backend endpoint, converts `/dashboard/polls/*` page routes to **routed modals** over a My polls background, and adds a ⌘K **sidebar search**.
**Decomposition:** Part of the 3-spec sequence aligning the dashboard with [`design/Polls App.html`](../../../design/Polls%20App.html). Spec 1 landed the shell. Spec 2 (this one) reshapes the dashboard content. Spec 3 will add the Settings modal.
**Depends on:** Spec 1 (`2026-05-27-dashboard-shell-design.md`) — the shell + sidebar + top bar must exist.

## Problem

After Spec 1 the `/dashboard` area has the design's shell but the body content still uses the old card list and full-page routes for create/edit/per-poll-analytics. The canonical design uses a sortable-looking polls table with checkbox-driven bulk-select, an `Export CSV` button in the table header, a ⌘K search in the sidebar that filters the active table, and modals (not pages) for create/edit/per-poll-analytics.

## Goal

Bring the dashboard body content in line with the design:
- Replace the card list with `AdminPollsTable` on both **My polls** and a new **All polls** (admin) tab.
- Convert `/dashboard/polls/new`, `/dashboard/polls/:id/edit`, `/dashboard/polls/:id/analytics` into routed modals overlaid on the My polls background.
- Add a sidebar ⌘K search that filters the currently visible table client-side.

## Non-goals (deferred or dropped)

- **Real bulk-delete endpoint.** The bulk-actions bar renders a `Delete selected` button that is a **visual no-op** (matches the bell + help placeholders from Spec 1). Future spec may wire it up.
- **Real Export CSV endpoint.** The `Export CSV` button in the table header is also a **visual no-op**.
- **Settings modal** (Spec 3).
- **System sidebar item** (dropped permanently per earlier choice).
- **Workspace > Analytics sidebar item** (dropped permanently).
- **Active/Inactive bulk action.** Only per-row Deactivate/Activate remains.
- **Context-aware modal background.** All modals render with My polls as the background, even when opened from All polls. Tradeoff accepted.

## Constraints from prior choices

- Bulk delete: dummy button, no backend.
- Export CSV: dummy button.
- All polls: included with a new backend endpoint.
- Modal background: always My polls.
- Per-row action set kept as-is (Deactivate / Copy link / Analytics / Edit / Delete) — design only shows the latter three, but we keep working functionality.

## Design

### Backend addition

**New endpoint:** `GET /api/v1/admin/polls`

- Admin-only — use the same `AdminRoleGuard` from `backend/src/common/guards/admin-role.guard.ts` that `/admin/users` uses.
- Query params: `page`, `pageSize` (same shape as `GET /polls`).
- Response: `PollListResponseDto` — same shape as the existing `GET /polls`, but returns all polls system-wide (no `ownerId` filter).
- Implementation: add a `listAll(page, pageSize)` method to the polls service (mirroring `list(ownerId, ...)` without the `ownerId` filter), and a new `AdminPollsController` at `backend/src/polls/admin-polls.controller.ts` decorated with `@Controller('admin/polls')` + `@UseGuards(AdminRoleGuard)`. Register it in `PollsModule.controllers`. This matches the `UsersController` pattern (single admin-namespaced controller colocated with the domain module).

**Frontend hook:** `useAdminPolls({ page?, pageSize?, enabled? })` in `frontend/src/api/queries/admin.ts`. Mirrors `useAdminUsers` shape. The OpenAPI client + schema will be regenerated to include the new path.

### New routes

| Path | Element | Notes |
|---|---|---|
| `/dashboard/all-polls` | `<RequireAdmin><AllPollsTab /></RequireAdmin>` | new admin tab |
| `/dashboard/polls/new` | `<MyPollsTab />` (background only) | shell renders `PollFormModal` overlay |
| `/dashboard/polls/:id/edit` | `<MyPollsTab />` (background only) | shell renders `PollFormModal` overlay |
| `/dashboard/polls/:id/analytics` | `<MyPollsTab />` (background only) | shell renders `AnalyticsModal` overlay |

Other routes from Spec 1 unchanged (`/dashboard` → MyPollsTab, `/dashboard/all-users` → UsersTab, plus all redirects).

### Modal overlay strategy

`DashboardShell` uses `useMatch()` to detect the three modal paths and conditionally renders the corresponding modal as a sibling of `<Outlet />`. The modal is closed by navigating back to `/dashboard`.

```tsx
function DashboardShell() {
  const newMatch = useMatch('/dashboard/polls/new');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {newMatch && <PollFormModal mode="create" />}
      {editMatch && <PollFormModal mode="edit" id={editMatch.params.id!} />}
      {analyticsMatch && <AnalyticsModal id={analyticsMatch.params.id!} />}
    </div>
  );
}
```

When a modal route is active, the `<Outlet />` still renders MyPollsTab (the modal route's element), and the modal overlays on top. Because the route element switches from MyPollsTab (index) to MyPollsTab (modal path), React Router unmounts and remounts MyPollsTab. React Query cache makes the data instant; selection state and scroll position reset. Acceptable.

### New frontend components

#### Generic `Modal` primitive — `frontend/src/components/primitives/Modal/`

- Files: `Modal.tsx`, `index.ts`, `hooks/useModal.ts`, `types.ts`
- Props: `{ open, onClose, size?, title, subtitle?, children, footer? }`. `size` is `'sm' | 'md' | 'lg' | 'xl'` (sm→max-w-md, md→max-w-lg, lg→max-w-2xl, xl→max-w-4xl). Default `'md'`.
- Behavior: scrim click closes (unless `closeOnScrim` is false), Escape closes, body scroll lock on open.
- Renders into a `<div role="dialog" aria-modal="true">` with `<h2>` for title and `<p>` for subtitle.
- Reuses the structural pattern from `ConfirmDialog` but with header/body/footer slots.

#### `AdminPollsTable` — `frontend/src/routes/dashboard/AdminPollsTable/`

- Files: `AdminPollsTable.tsx`, `index.ts`, `hooks/useAdminPollsTable.ts`, `types.ts`
- Props: `{ polls: PollSummaryDto[] }`. Internally manages selection state.
- Layout (matches design):
  - Header row: `{filtered.length} polls` (or `{N} selected` if selection non-empty) on the left, dummy `Export CSV` button on the right.
  - Bulk-actions bar visible when any selection exists: shows `{N} selected` + `Clear` button + dummy `Delete selected` button (red).
  - Table: `<table>` with columns `checkbox | Poll (title + slug) | Visibility | Status | Responses | Actions`.
  - Row actions: `Deactivate/Activate` / `Copy link` / `Analytics` / `Edit` / `Delete` — keeping current PollListItem functionality.
- Search-aware: reads `search` from `SidebarSearchContext`, filters `polls` by `title.toLowerCase().includes(search)` or `slug.toLowerCase().includes(search)`.
- Empty result: when filtering returns nothing, shows an inline empty state "No polls match '{search}'".
- Dummy actions:
  - `Export CSV` and `Delete selected` clicks call `toast.message('Coming soon')` from `sonner` (already in deps).

#### `AllPollsTab` — `frontend/src/routes/dashboard/AllPollsTab/`

- Files: `AllPollsTab.tsx`, `index.ts`, `hooks/useAllPollsTab.ts`, `types.ts`
- Calls `useAdminPolls()`. Renders `<AdminPollsTable polls={data?.items ?? []} />` plus a loading spinner and an error state, mirroring `MyPollsTab`.
- Admin-gated by `RequireAdmin` at the route level.

#### `PollFormModal` — `frontend/src/layouts/DashboardShell/modals/PollFormModal/`

- Files: `PollFormModal.tsx`, `index.ts`, `hooks/usePollFormModal.ts`, `types.ts`
- Renders `<Modal>` size="xl" titled `New poll` (mode=create) or `Edit poll` (mode=edit).
- Body: a `PollForm` component (extracted from current `PollFormScreen`) — same fields, validations, mutations.
- Mode = edit: fetches `usePoll(id)`; spinner while loading.
- Submit success → `navigate('/dashboard')` (closes the modal).
- Cancel button in footer → same navigation.

#### `AnalyticsModal` — `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/`

- Files: `AnalyticsModal.tsx`, `index.ts`, `hooks/useAnalyticsModal.ts`, `types.ts`
- Props: `{ id: string }`
- Renders `<Modal>` size="xl" titled `Analytics` with subtitle `For <b>{poll.title}</b> · /{poll.slug}`.
- Body: existing analytics view content (questions list, response counts).
- Footer: dummy `Export CSV` (no-op) + `Done` (closes).
- Close → `navigate('/dashboard')`.

#### `SidebarSearch` — `frontend/src/layouts/DashboardShell/Sidebar/SidebarSearch/`

- Files: `SidebarSearch.tsx`, `index.ts`, `hooks/useSidebarSearch.ts`, `types.ts`
- Renders an `<input>` with magnifier icon and `⌘K` kbd hint chip.
- Reads/writes `SidebarSearchContext`.
- `useSidebarSearch` registers a global keydown listener for `Meta+K` / `Ctrl+K` and focuses the input.
- Placement: at the top of `Sidebar`, below `BrandMark`, above the section list.

### `SidebarSearchContext`

- `frontend/src/layouts/DashboardShell/SidebarSearchContext.tsx` — React context with `{ search: string; setSearch: (v: string) => void }`.
- Provider mounted in `DashboardShell`. State held with `useState('')`.
- Consumed by `SidebarSearch` (writer) and `AdminPollsTable` (reader).
- Search persists across My polls ↔ All polls tab switches (provider lives in the shell, which doesn't unmount on tab change).

### Components updated

- `MyPollsTab/MyPollsTab.tsx` — replace the card list mapping with `<AdminPollsTable polls={data?.items ?? []} />`. Loading and empty state stay (the no-polls-yet empty state shows when `data.items.length === 0`, not when search returns empty — those are different states).
- `DashboardShell/DashboardShell.tsx` — wrap children in `<SidebarSearchProvider>`; render modal overlays via `useMatch`.
- `Sidebar/Sidebar.tsx` — render `<SidebarSearch />` below `BrandMark`; add `All polls` sidebar item under Staff section (next to All users).
- `router.tsx` — `polls/new`, `polls/:id/edit`, `polls/:id/analytics` route elements become `<MyPollsTab />` (background). Add `all-polls` route. Old redirect-to-`/dashboard/polls/*` paths remain (still work since the destination paths still exist).
- `frontend/src/api/queries/admin.ts` — add `useAdminPolls()` next to `useAdminUsers()`.
- `frontend/src/api/queries/polls.ts` — unchanged (already has `usePoll(id)`).

### Components deleted

- `frontend/src/routes/polls/PollFormScreen/` — replaced by `PollFormModal` + a sibling `PollForm` component that holds the form internals.
- `frontend/src/routes/polls/analytics/OwnerAnalyticsScreen/` — its body becomes the content of `AnalyticsModal`.
- `frontend/src/routes/dashboard/PollListItem/` — replaced by the table row inside `AdminPollsTable`.

### Where the form internals live

The current `PollFormScreen` is a page with a `<section className="max-w-3xl…">` wrapper plus inner form logic (questions, options, validation). Extract the inner form content as a `PollForm` component at `frontend/src/routes/dashboard/PollForm/`. Both Spec 2 `PollFormModal` and any future page-mode revival can reuse it. The wrapper section markup is dropped (modal provides its own chrome).

### Toast wiring

`sonner`'s `<Toaster richColors position="top-right" />` is already mounted in `frontend/src/App.tsx`. Dummy buttons call `toast.message('Coming soon')` from `sonner`. No app-root changes needed.

## Verification

After implementation, on a local dev server:

1. Non-admin user on `/dashboard`:
   - Sidebar shows brand, search input with ⌘K hint, Workspace > My polls.
   - Main area shows the table of polls (not cards). Header reads `N polls` + Export CSV button. No bulk bar visible.
   - Click any row's `Edit` → URL becomes `/dashboard/polls/:id/edit`; modal opens with the existing form prefilled; background still shows table.
   - Submit edit → modal closes, returned to `/dashboard`.
   - Click `Export CSV` → toast "Coming soon".
2. Admin user on `/dashboard`:
   - Sidebar shows Workspace > My polls AND Staff > All users + All polls.
   - Click `All polls` → URL `/dashboard/all-polls`; table renders all polls system-wide.
   - Search "foo" in sidebar → both `My polls` and `All polls` tables filter by title/slug. Switching tabs preserves the search term.
3. Open New poll modal via `+ New poll` button on the top bar:
   - URL `/dashboard/polls/new`; modal opens with empty form.
   - Cancel or submit → modal closes; back on `/dashboard`.
4. Open Analytics modal from a row → URL `/dashboard/polls/:id/analytics`; modal shows the existing analytics body. Done button closes.
5. Click `Delete selected` (after checking some rows) → toast "Coming soon". Selection persists.
6. Press ⌘K anywhere on `/dashboard/*` → search input focuses.
7. Direct deep-link to `/dashboard/polls/new` → background MyPollsTab loads + modal opens.
8. Old `/polls/new` redirect → `/dashboard/polls/new` → modal opens.

## Risks

- **MyPollsTab remount on modal navigation.** Documented above. Acceptable.
- **Form refactor.** Extracting `PollForm` from `PollFormScreen` may touch validation, mutation hooks, and the question/option editors. Largest risk in the spec. Plan a dedicated implementation task with careful before/after parity.
- **Modal stacking.** ConfirmDialog (used for poll delete confirmation) appears inside the modal flow when the user clicks Delete from the analytics or edit modal. Two scrims layered — ensure z-index ordering puts ConfirmDialog above Modal. Easiest: ConfirmDialog z-50, Modal z-40.
- **Backend new endpoint.** `/api/v1/admin/polls` route + service method + OpenAPI re-export + frontend schema regen. Coordinate the generation step in the plan.
- **OpenAPI schema regen.** Adding `/admin/polls` requires regenerating `frontend/src/api/schema.ts` from the backend OpenAPI spec. Plan needs an explicit task for this so the frontend hook is typed.
