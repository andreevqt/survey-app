# Admin polls mutations — design

**Date:** 2026-05-28
**Scope:** Backend (5 new endpoints) + frontend (5 new hooks, mode-aware table + modals, 2 new routes).
**Follow-up to:** [`2026-05-27-polls-table-and-modals-design.md`](2026-05-27-polls-table-and-modals-design.md) (Spec 2). Final reviewer flagged that admin actions on All Polls hit owner-scoped endpoints and silently 404 for non-owned polls.

## Problem

After Spec 2 landed, the All Polls admin tab renders the same `AdminPollsTable` with per-row actions (Deactivate / Copy link / Analytics / Edit / Delete). The table's mutation hooks (`useToggleActive`, `useDeletePoll`, `useUpdatePoll`) and the modals' read hooks (`usePoll`, `usePollAnalytics`) all hit owner-scoped endpoints at `/polls/:id`. When an admin clicks any of these on a poll they don't own, the service's `findFirst({ where: { id, ownerId } })` returns nothing → 404, silent failure.

## Goal

Let admin act on any poll from the All Polls tab. Route admin actions through admin-scoped backend endpoints. Distinguish admin vs owner context by URL path so the routing is self-describing (deep links + browser back work).

## Non-goals

- No changes to owner endpoints (`/polls/:id`). They stay strictly owner-scoped.
- No relaxing the owner-check inside `PollsService`. Clean separation.
- No real bulk-delete (still a dummy toast). Out of scope.
- No edits to existing tests (project defers tests).

## Design

### Backend — 5 new admin endpoints

All on the existing `AdminPollsController` (`backend/src/polls/admin-polls.controller.ts`, gated by `AdminRoleGuard`). Each pairs with a new service method that mirrors the owner-scoped method minus the `ownerId` filter.

| Endpoint | Controller method | Service method |
|---|---|---|
| `GET /admin/polls/:id` | `getOne(id)` | `findOneById(id)` |
| `PATCH /admin/polls/:id` | `update(id, body)` | `updateById(id, body)` |
| `DELETE /admin/polls/:id` | `remove(id)` | `deleteById(id)` |
| `PATCH /admin/polls/:id/active` | `toggleActive(id, body)` | `toggleActiveById(id, isActive)` |
| `GET /admin/polls/:id/analytics` | `getAnalytics(id)` | `findAnalyticsById(id)` |

Service refactor approach: extract the body of each existing owner method (e.g. `findOne(ownerId, id)`) into a private helper that takes `where: { id, ...maybeOwner }`. Both the owner-scoped and admin-scoped public methods call the helper. This keeps the SQL in one place; the only difference is whether `ownerId` appears in the where clause.

Concretely, for the simpler methods (`delete`, `toggleActive`) just write the admin variant directly without the helper — they're 3–5 lines each. For `findOne`, `update`, `findAnalytics` (longer methods with includes / mappings), extract a `_findById({ id, ownerId? })` style helper.

### Frontend hooks (regenerated schema first via `npm run gen:api`)

New hooks under `frontend/src/api/queries/admin.ts`:
- `useAdminPoll(id)` — calls `GET /admin/polls/:id`. queryKey: `['admin', 'polls', id]`.
- `useAdminPollAnalytics(id)` — calls `GET /admin/polls/:id/analytics`. queryKey: `['admin', 'polls', id, 'analytics']`.

New hooks under `frontend/src/api/mutations/admin.ts` (NEW file — `admin.ts` doesn't exist under `mutations/` yet):
- `useUpdateAdminPoll(id)` — `PATCH /admin/polls/:id`.
- `useDeleteAdminPoll()` — `DELETE /admin/polls/:id`.
- `useAdminToggleActive()` — `PATCH /admin/polls/:id/active`.

All three mutations invalidate both `['polls']` and `['admin', 'polls']` on success (same dual-invalidation pattern as commit `7329d7e`).

### Frontend routing — 2 new admin paths

Routes added under `/dashboard`:
- `/dashboard/all-polls/:id/edit` — element `<AllPollsTab />` (admin background); `DashboardShell` renders `<PollFormModal mode="admin" id={...} />` overlay.
- `/dashboard/all-polls/:id/analytics` — element `<AllPollsTab />`; `DashboardShell` renders `<AnalyticsModal mode="admin" id={...} />` overlay.

Existing routes are unchanged:
- `/dashboard/polls/new` — owner-mode create modal over MyPollsTab.
- `/dashboard/polls/:id/edit` — owner-mode edit modal over MyPollsTab.
- `/dashboard/polls/:id/analytics` — owner-mode analytics modal over MyPollsTab.

When an admin clicks Edit on a non-owned poll in All Polls, the row action navigates to `/dashboard/all-polls/:id/edit`. The URL explicitly encodes the admin context.

`DashboardShell` adds two more `useMatch` checks and two more conditional modal renders:

```tsx
const adminEditMatch = useMatch('/dashboard/all-polls/:id/edit');
const adminAnalyticsMatch = useMatch('/dashboard/all-polls/:id/analytics');
// ...
{adminEditMatch && <PollFormModal context="admin" mode="edit" id={adminEditMatch.params.id!} />}
{adminAnalyticsMatch && <AnalyticsModal context="admin" id={adminAnalyticsMatch.params.id!} />}
```

`PollFormModal` currently has a `mode: 'create' | 'edit'` prop. We add a separate `context: 'owner' | 'admin'` prop, leaving `mode` for create/edit semantics.

### Frontend component changes

#### `AdminPollsTable` gains a `context` prop

```ts
export interface AdminPollsTableProps {
  polls: PollSummary[];
  onDelete: (id: string) => void;
  context?: 'owner' | 'admin'; // default 'owner'
}
```

`useAdminPollsTable({ polls, context })` selects:
- `useToggleActive` (owner) vs `useAdminToggleActive` (admin) for the row Deactivate/Activate button.
- Edit navigation: `/dashboard/polls/:id/edit` vs `/dashboard/all-polls/:id/edit`.
- Analytics navigation: `/dashboard/polls/:id/analytics` vs `/dashboard/all-polls/:id/analytics`.
- Copy link: unchanged (no backend call).

`MyPollsTab` passes nothing (defaults to `'owner'`). `AllPollsTab` passes `context="admin"`.

#### `MyPollsTab` and `AllPollsTab` delete confirmation

`MyPollsTab` keeps using `useDeletePoll` (owner). `AllPollsTab` switches to `useDeleteAdminPoll`. Same `ConfirmDialog` pattern; only the mutation differs.

#### `PollFormModal` gains a `context` prop

```ts
export interface PollFormModalProps {
  context?: 'owner' | 'admin'; // default 'owner'
  mode: 'create' | 'edit';
  id?: string;
}
```

The modal delegates to the existing `PollForm` component. `PollForm` accepts an optional `context` prop that picks between `usePoll` and `useAdminPoll` for hydration, and between `useUpdatePoll` and `useUpdateAdminPoll` for the submit. Create mode uses owner endpoint regardless (admins also create their own polls; All Polls' `+ New poll` button still creates as the admin user).

Wait — `+ New poll` from All Polls tab. The current TopBar `+ New poll` button always navigates to `/dashboard/polls/new` (owner create). That's correct — an admin creating a poll authors their own poll, no need for admin-scoped create. No change.

So `PollFormModal context="admin"` only applies to **edit mode**. The component handles `mode="edit" context="admin"` by reading/writing via the admin hooks.

#### `AnalyticsModal` gains a `context` prop

Same pattern. Picks `useAnalyticsModal` hook variant (or accepts a `context` arg that the hook threads into `usePoll` vs `useAdminPoll` and `usePollAnalytics` vs `useAdminPollAnalytics`).

#### `PollForm` updates

`usePollForm({ id, context, onSuccess })` reads `context` and picks the appropriate read + update hooks. Only behavioural change is which endpoint URLs are used.

### File map

**Backend create:** none (extending existing controller).

**Backend modify:**
- `backend/src/polls/polls.service.ts` — add `findOneById`, `updateById`, `deleteById`, `toggleActiveById`, `findAnalyticsById`. Refactor the existing owner methods to share private helpers where it cleans up duplication.
- `backend/src/polls/admin-polls.controller.ts` — add 5 new handler methods.

**Backend regenerate:** `openapi.json`, `frontend/src/api/schema.ts`.

**Frontend create:**
- `frontend/src/api/mutations/admin.ts` — 3 new admin mutation hooks.

**Frontend modify:**
- `frontend/src/api/queries/admin.ts` — add 2 new admin query hooks.
- `frontend/src/routes/dashboard/AdminPollsTable/types.ts` — add `context` prop.
- `frontend/src/routes/dashboard/AdminPollsTable/hooks/useAdminPollsTable.ts` — accept `context` arg and select hooks/URLs.
- `frontend/src/routes/dashboard/AllPollsTab/AllPollsTab.tsx` — pass `context="admin"`; use `useDeleteAdminPoll`.
- `frontend/src/routes/dashboard/AllPollsTab/hooks/useAllPollsTab.ts` — use `useDeleteAdminPoll`.
- `frontend/src/routes/dashboard/PollForm/types.ts` — add `context` prop.
- `frontend/src/routes/dashboard/PollForm/hooks/usePollForm.ts` — accept `context` and switch hooks.
- `frontend/src/routes/dashboard/PollForm/PollForm.tsx` — pass `context` through.
- `frontend/src/layouts/DashboardShell/modals/PollFormModal/types.ts` — add `context`.
- `frontend/src/layouts/DashboardShell/modals/PollFormModal/PollFormModal.tsx` — thread `context` to `PollForm`; route close to correct admin/owner home.
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/types.ts` — add `context`.
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/hooks/useAnalyticsModal.ts` — accept `context` and switch hooks.
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/AnalyticsModal.tsx` — pass `context` through.
- `frontend/src/layouts/DashboardShell/DashboardShell.tsx` — add 2 more `useMatch` checks + admin modal renders.
- `frontend/src/router.tsx` — add `all-polls/:id/edit` and `all-polls/:id/analytics` child routes under `/dashboard`.

### Close-modal navigation

When user closes a modal:
- Owner context → `navigate('/dashboard')` (back to My polls).
- Admin context → `navigate('/dashboard/all-polls')` (back to All polls).

The modal reads its own `context` prop and picks the right home.

### Verification

After implementation, on a local dev server:

1. **As admin on `/dashboard/all-polls`:**
   - Click Edit on a non-owned poll → URL becomes `/dashboard/all-polls/:id/edit`; modal opens with the form prefilled (admin endpoint hydrates).
   - Submit → returns to `/dashboard/all-polls`; row updates.
   - Click Delete on a non-owned poll → ConfirmDialog → poll deletes via admin endpoint; row removed from the table.
   - Click Deactivate on a non-owned poll → poll toggles; badge flips.
   - Click Analytics → URL becomes `/dashboard/all-polls/:id/analytics`; modal shows the analytics view.
2. **As admin on `/dashboard` (My polls):**
   - All existing behaviour unchanged (uses owner endpoints).
3. **As non-admin on `/dashboard`:**
   - All existing behaviour unchanged.
4. **Backend regen:** `openapi.json` and `frontend/src/api/schema.ts` include `/admin/polls/:id`, `/admin/polls/:id/active`, `/admin/polls/:id/analytics`.
5. **Typecheck:** `npm run check:ts` clean (backend + frontend).

### Risks

- **Behavioural drift between owner and admin service methods.** If both implementations diverge over time (e.g. owner gets a new validation rule but admin doesn't), admin behaviour silently differs. The private helper approach mitigates this.
- **`PollForm` hook switching.** `usePoll(id)` vs `useAdminPoll(id)` need to be selected at call time, but React hooks can't be conditional. Solution: gate via the existing `enabled: !!id` mechanism — pass `id` to the active hook and `undefined` to the inactive one. Concretely in `usePollForm`:

  ```ts
  const ownerPoll = usePoll(context === 'owner' ? id : undefined);
  const adminPoll = useAdminPoll(context === 'admin' ? id : undefined);
  const pollQuery = context === 'admin' ? adminPoll : ownerPoll;
  ```

  Both hooks are called every render (hook order preserved); only one fires a network request. `useAdminPoll` follows the same `enabled: !!id` pattern as `usePoll`.
- **Cache key collision.** The admin queries use `['admin', 'polls', id]` and `['admin', 'polls', id, 'analytics']`. The list query is `['admin', 'polls', { page, pageSize }]`. Hierarchical invalidation of `['admin', 'polls']` covers all three. Fine.
- **OpenAPI schema regen requires running backend.** Same workaround as Spec 2 Task 1 if running outside Docker (run `spec:export` inside the container).
