# Dashboard header restyle — design

**Date:** 2026-05-27
**Scope:** Frontend only. One screen: `/dashboard` (and its admin sub-tabs).
**Out of scope:** Admin shell with sidebar nav, stat-cards dashboard, route restructure, any backend or routing changes.

## Problem

The current `/dashboard` page header changes per tab (title becomes "My polls" / "Users" / "Analytics"; welcome subtitle and "Create poll" CTA only appear on the My polls tab). The design (`design/PollScreens.jsx` → `DashboardScreen`) shows a single constant page header — `Dashboard` title, `Welcome back, {name}` subtitle, and a primary `Create Poll` CTA — with sub-views distinguished by the tab strip below.

## Goal

Make the dashboard header constant across all tabs and align it with the design's user dashboard look. Keep the existing tab-strip structure (admin sub-tabs stay under `/dashboard/*`).

## Non-goals

- No admin shell, sidebar nav, or new admin Dashboard page.
- No restructure of the polls list, empty state, or poll list item.
- No router changes, auth-gating changes, or new routes.
- No backend changes.

## Design

### Header (constant across tabs)

- `h1`: `Dashboard`
- Subtitle: `Welcome back, {user.name}` — rendered only when `user.name` is truthy. No trailing period (design matches without one).
- Right-side CTA: primary button `Create Poll` linking to `/polls/new`, always visible.
- Layout: existing flex/wrap row, unchanged. Container stays `max-w-4xl mx-auto py-12 px-6`.

### TabStrip (unchanged behavior)

- Non-admin users: one tab — `My polls` (`/dashboard`, end-matched).
- Admin users: three tabs — `My polls` (`/dashboard`), `Users` (`/dashboard/users`), `Analytics` (`/dashboard/analytics`).
- Rendered below the header with `mt-6` (current spacing).

### `Outlet` (unchanged)

The matched sub-route (`MyPollsTab` / `UsersTab` / `AnalyticsTab`) renders below the TabStrip via `<Outlet />`. Their internals are not modified.

## Affected files

- `frontend/src/routes/dashboard/DashboardScreen/DashboardScreen.tsx` — replace per-tab `meta` rendering with constant header. Button label becomes `Create Poll`.
- `frontend/src/routes/dashboard/DashboardScreen/hooks/useDashboardScreen.ts` — drop `tabMetaForPath`; remove `useLocation` import. Return `{ userName, tabs }` instead of `{ meta, tabs }`.
- `frontend/src/routes/dashboard/DashboardScreen/types.ts` — remove the `TabMeta` type. Keep `DashboardScreenProps` (re-exported by `index.ts`). File stays.

## Data flow

1. `DashboardScreen` calls `useDashboardScreen()`.
2. Hook calls `useAuth()` once, reads `user?.name` and `user?.role`.
3. Hook returns `{ userName: user?.name, tabs }` where `tabs` is built by role (admin → 3 tabs, otherwise → 1 tab). No `useLocation` needed.
4. Screen renders the constant header + tabs + `<Outlet />`.

## Visual reference

Source: `design/PollScreens.jsx` lines 137–181 (`DashboardScreen`).

Differences from the design that we intentionally **keep** (not in scope):

- Admin still navigates via the in-page tab strip rather than via an `Admin Panel` button into a separate admin shell.
- Container padding stays `py-12 px-6` (current) rather than the design's `32px 16px`; current spacing reads better at the screen widths we target.

## Verification

After implementation, on a local dev server:

- As a non-admin user: visit `/dashboard`. Header shows `Dashboard` + `Welcome back, {name}` + `Create Poll` button. One tab visible.
- As an admin user: visit `/dashboard`, then click `Users`, then `Analytics`. Header text and CTA remain identical across all three tabs. Active tab indicator follows the route.
- Click `Create Poll` from any tab → navigates to `/polls/new`.
- `npm run lint` and `npm run typecheck` (or project equivalents) pass; no unused imports/types.

## Risks

Minimal. Visual-only change in one screen; admin sub-tab content is untouched. Type removal in `types.ts` is local to the dashboard route.
