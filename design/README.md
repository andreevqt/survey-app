# Polls — Web UI Kit

High-fidelity React recreation of the Polls product. Vanilla CSS (extracted from the codebase's Tailwind classes) + plain React 18 (no router, no React Query) so the kit runs as a single `index.html` with no build step.

## Run

Open `index.html` in a browser. The floating bottom-center bar lets you jump between every screen.

## Routes recreated

| Screen | File | Notes |
|---|---|---|
| Landing | `AuthScreens.jsx` → `LandingScreen` | Indigo CTAs, mark + wordmark |
| Sign in / Register | `AuthScreens.jsx` | `react-hook-form` stripped, plain `useState` |
| User dashboard | `PollScreens.jsx` → `DashboardScreen` | Poll list, create button, empty state |
| Poll page | `PollScreens.jsx` → `PollScreen` | Single / multi / text question types |
| Analytics | `PollScreens.jsx` + `AdminScreens.jsx` → `AnalyticsView` | Per-question progress bars |
| Admin shell | `AdminScreens.jsx` → `AdminShell` | Dark sidebar + page header |
| Admin dashboard | `AdminScreens.jsx` → `AdminDashboard` | Stat cards + recent polls table |
| Admin users | `AdminScreens.jsx` → `AdminUsersTable` | Selectable rows + bulk-actions bar |
| Admin analytics | `AdminScreens.jsx` → `AnalyticsView` | Same component as user analytics |

## Components

Each `.jsx` file exposes its components to `window` so siblings can import via globals.

- **`Primitives.jsx`** — `Button`, `Badge`, `Avatar`, `Input`, `Field`, `Spinner`, `StatCard`
- **`AuthScreens.jsx`** — `LandingScreen`, `LoginScreen`, `RegisterScreen`, `AuthCard`
- **`PollScreens.jsx`** — `QuestionRenderer`, `PollScreen`, `PollListItem`, `DashboardScreen`, `ConfirmDialog`
- **`AdminScreens.jsx`** — `AdminSidebar`, `AdminHeader`, `AdminShell`, `AdminDashboard`, `AdminUsersTable`, `AnalyticsView`, `QuestionAnalyticsCard`

## Styles

All styling lives in `styles.css` as plain CSS classes. The component files use those classes (`.btn`, `.card`, `.badge`, …) plus a few inline styles for layout. CSS custom properties at the top of `styles.css` carry the color tokens.

## What is intentionally cut

- API calls (TanStack Query, Axios, refresh-token interceptor)
- Form validation (Zod, react-hook-form)
- Route protection / auth state (Zustand)
- The full create/edit poll modal (`PollFormModal` — large, mostly form plumbing)
- The advanced filter panel on admin pages
- Recharts timeline chart (per-question bars are recreated; line chart is omitted)

The goal of the kit is **pixel-perfect surfaces and interactions**, not production-ready code. Take the visuals, drop them onto real plumbing in the upstream app.
