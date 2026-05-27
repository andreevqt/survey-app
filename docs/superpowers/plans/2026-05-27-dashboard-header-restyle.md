# Dashboard Header Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/dashboard` show a single constant header (`Dashboard` + `Welcome back, {name}` + `Create Poll` CTA) across all tabs, matching the design's user dashboard.

**Architecture:** Two-file change in the existing `DashboardScreen` route folder. The view-model hook (`useDashboardScreen`) stops branching by pathname and instead returns the current user's name alongside the tab list. The screen component renders the constant header and forwards `tabs` to `TabStrip`. The `TabMeta` type is removed since per-tab metadata no longer exists. No router, auth-gating, or sub-tab changes.

**Tech Stack:** React 19, react-router-dom 6, TypeScript, Tailwind CSS (utility classes). Tests are deferred per project preference — code-first, then validate via `tsc --noEmit`, `eslint`, and a manual dev-server smoke.

**Spec:** [docs/superpowers/specs/2026-05-27-dashboard-header-restyle-design.md](../specs/2026-05-27-dashboard-header-restyle-design.md)

---

## File map

- **Modify** `frontend/src/routes/dashboard/DashboardScreen/types.ts` — remove `TabMeta`; keep `DashboardScreenProps` (re-exported by `index.ts`).
- **Modify** `frontend/src/routes/dashboard/DashboardScreen/hooks/useDashboardScreen.ts` — drop `useLocation` + `tabMetaForPath`; return `{ userName, tabs }`.
- **Modify** `frontend/src/routes/dashboard/DashboardScreen/DashboardScreen.tsx` — render constant header from `userName` + hardcoded title/subtitle/CTA strings.

No other files are touched. `MyPollsTab`, `UsersTab`, `AnalyticsTab`, `PollListItem`, `TabStrip`, `useAuth`, and the router stay as-is.

---

## Task 1: Update the view-model — `useDashboardScreen` + types

**Files:**
- Modify: `frontend/src/routes/dashboard/DashboardScreen/types.ts`
- Modify: `frontend/src/routes/dashboard/DashboardScreen/hooks/useDashboardScreen.ts`

- [ ] **Step 1: Remove `TabMeta` from `types.ts`**

Replace the full contents of `frontend/src/routes/dashboard/DashboardScreen/types.ts` with:

```ts
export type DashboardScreenProps = Record<PropertyKey, never>;
```

(Just delete the `TabMeta` line and the blank line above `DashboardScreenProps`. Keep `DashboardScreenProps` — it's re-exported by `index.ts`.)

- [ ] **Step 2: Rewrite `useDashboardScreen` to return `{ userName, tabs }`**

Replace the full contents of `frontend/src/routes/dashboard/DashboardScreen/hooks/useDashboardScreen.ts` with:

```ts
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
```

Changes vs. previous version:
- Removed `useLocation` import and `tabMetaForPath` helper.
- Removed `TabMeta` import.
- Return shape: `{ userName, tabs }` instead of `{ meta, tabs }`.

- [ ] **Step 3: Typecheck — should still fail because `DashboardScreen.tsx` reads `meta.title` etc.**

Run:

```bash
cd frontend && npm run check:ts
```

Expected: TypeScript errors in `DashboardScreen.tsx` referencing the removed `meta` property. That's fine — fixed in Task 2.

- [ ] **Step 4: No commit yet — wait until Task 2 is done so the tree is consistent.**

---

## Task 2: Update `DashboardScreen` to render the constant header

**Files:**
- Modify: `frontend/src/routes/dashboard/DashboardScreen/DashboardScreen.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `frontend/src/routes/dashboard/DashboardScreen/DashboardScreen.tsx` with:

```tsx
import { Link, Outlet } from 'react-router-dom';
import { Button } from '../../../components/primitives/Button';
import { TabStrip } from '../../../components/primitives/TabStrip';
import { useDashboardScreen } from './hooks/useDashboardScreen';

export function DashboardScreen() {
  const { userName, tabs } = useDashboardScreen();

  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {userName && (
            <p className="mt-1 text-sm text-gray-600">Welcome back, {userName}</p>
          )}
        </div>
        <Link to="/polls/new"><Button>Create Poll</Button></Link>
      </div>

      <div className="mt-6">
        <TabStrip tabs={tabs} />
      </div>

      <Outlet />
    </section>
  );
}
```

Key differences vs. previous version:
- `h1` text is the literal `Dashboard` — no per-tab branching.
- Subtitle renders only when `userName` is truthy; text is `Welcome back, {userName}` (no trailing period).
- CTA is always rendered (no `meta.showCreateCta` gate). Button label is `Create Poll` (matches design).
- Reads `userName` instead of `meta` from the hook.

- [ ] **Step 2: Typecheck**

Run:

```bash
cd frontend && npm run check:ts
```

Expected: no errors.

- [ ] **Step 3: Lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: no errors, no warnings (project runs with `--max-warnings 0`).

If lint complains about unused imports somewhere, re-check that `TabMeta` is not still imported anywhere. Grep to confirm:

```bash
grep -rn "TabMeta" frontend/src
```

Expected: no matches.

- [ ] **Step 4: Manual smoke test on dev server**

Run:

```bash
cd frontend && npm run dev
```

Open the printed URL. Verify the following:

1. **Logged out → redirected away from `/dashboard`** (existing `RequireAuth` behavior; not part of this change but should still work).
2. **As a non-admin user (sign in or register a new account):** visit `/dashboard`. Confirm:
   - `h1` reads `Dashboard`.
   - Subtitle reads `Welcome back, {your name}` (no period).
   - A primary `Create Poll` button is visible on the right of the header.
   - The TabStrip shows a single `My polls` tab.
3. **Click `Create Poll`** → navigates to `/polls/new`.
4. **As an admin user:** visit `/dashboard`, then click `Users`, then `Analytics`. After each navigation confirm the header (`Dashboard` / `Welcome back, {name}` / `Create Poll` button) is unchanged. Tab active indicator follows the route.
5. **Click `Create Poll` from the `Users` or `Analytics` tab** → still navigates to `/polls/new`.

Stop the dev server when done.

- [ ] **Step 5: Commit the cohesive change**

```bash
git add frontend/src/routes/dashboard/DashboardScreen/DashboardScreen.tsx \
        frontend/src/routes/dashboard/DashboardScreen/hooks/useDashboardScreen.ts \
        frontend/src/routes/dashboard/DashboardScreen/types.ts
git commit -m "$(cat <<'EOF'
feat(frontend): constant dashboard header across tabs

Replace per-tab title/subtitle/CTA logic in DashboardScreen with a
constant header matching the design's user dashboard: 'Dashboard' title,
'Welcome back, {name}' subtitle, and a primary 'Create Poll' button
that is always visible. useDashboardScreen no longer branches on
pathname and returns { userName, tabs }; TabMeta is removed.

Spec: docs/superpowers/specs/2026-05-27-dashboard-header-restyle-design.md
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Header (constant title/subtitle/CTA) → Task 2 Step 1. Hook simplification → Task 1 Step 2. `TabMeta` removal → Task 1 Step 1. `MyPollsTab` / `UsersTab` / `AnalyticsTab` / router untouched → no task, confirmed by file map. Verification (typecheck/lint/manual) → Task 2 Steps 2–4.
- **Placeholder scan:** No "TBD" / "appropriate error handling" / "similar to Task N" anywhere. All code blocks are complete.
- **Type consistency:** `useDashboardScreen` returns `{ userName, tabs }` in Task 1; `DashboardScreen.tsx` destructures the same names in Task 2. `TabStripItem` import path matches the existing one (`../../../../components/primitives/TabStrip`).
