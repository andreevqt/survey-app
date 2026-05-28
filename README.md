# Survey App

Full-stack polling platform. Monorepo with NestJS + Prisma backend and React + Vite frontend, orchestrated with Docker Compose. Deployed to a testing VPS on every push to `main` and to per-PR Vercel previews on every pull request.

Spec: [`docs/superpowers/specs/2026-05-26-survey-app-design.md`](docs/superpowers/specs/2026-05-26-survey-app-design.md)

Implementation plans:
- Plan 1 — Foundation + Auth: [`docs/superpowers/plans/2026-05-26-foundation-and-auth.md`](docs/superpowers/plans/2026-05-26-foundation-and-auth.md)
- Plan 2 — Polls + Public Responses: [`docs/superpowers/plans/2026-05-26-polls-and-responses.md`](docs/superpowers/plans/2026-05-26-polls-and-responses.md)
- Plan 3 — Analytics + Admin: [`docs/superpowers/plans/2026-05-26-analytics-and-admin.md`](docs/superpowers/plans/2026-05-26-analytics-and-admin.md)

---

## Features

### Auth & session
- Register, login, logout, silent refresh.
- JWT access + refresh tokens in `HttpOnly` cookies; refresh rotation (single-use, revoked-on-use).
- Role-aware UI: only `ADMIN` users see the Staff sidebar section.

### Polls — owner workflow
- **My polls** at [`/dashboard`](frontend/src/routes/dashboard/MyPollsTab) — your polls with response counts, status badges, Activate/Deactivate, Copy link, Analytics, Edit, Delete.
- **Create / edit** via [`/dashboard/polls/new`](frontend/src/routes/dashboard/PollForm) and `/dashboard/polls/:id/edit` — single-choice, multiple-choice, and free-text questions. Metadata (title, description, visibility, `expiresAt`, active toggle) is always editable.
- **Edit-lock on responses.** Once any response lands, the poll's *structure* (questions/options) is locked — title/description/visibility/active still editable. The form shows a banner and disables the locked fields. Backend re-enforces with `409 POLL_LOCKED_HAS_RESPONSES`.
- **Per-poll analytics** at `/dashboard/polls/:id/analytics` (modal) — total responses, per-question breakdown with proportional progress bars for choice questions, count summary for text questions.

### Public response page
- Anonymous respondents answer at [`/p/:slug`](frontend/src/routes/public).
- Cookie-based deduplication — same browser submitting twice gets `409 ALREADY_RESPONDED`.
- Inactive or expired polls render read-only ("This poll has closed").

### Admin Panel (`role === 'ADMIN'`)
- **All users** at [`/dashboard/all-users`](frontend/src/routes/dashboard/UsersTab) — paginated table, per-row role select (USER ↔ ADMIN), bulk select + bulk delete, CSV export (`id,name,email,role,createdAt` with UTF-8 BOM and RFC-4180 escaping). Safety guards: admins can't delete themselves; the system refuses to wipe the last admin.
- **All polls** at [`/dashboard/all-polls`](frontend/src/routes/dashboard/AllPollsTab) — every poll in the workspace with the same row actions as owner view (Deactivate / Edit / Analytics / Delete), routed through admin-scoped endpoints.
- Role changes invalidate the affected user's refresh tokens — they must re-login with the new role to see the Admin Panel link.

### Settings (modal at `/dashboard/settings`)
Six sections: Profile, Password, Email notifications, Appearance, Sessions, Danger zone (account deletion). Sections are independently saved.

### UI primitives
Custom Tailwind-styled primitives in [`frontend/src/components/primitives/`](frontend/src/components/primitives) — no headless-UI lib, all hand-rolled:
- **DataTable** — generic table with column config and optional row selection; backs both the users and all-polls views.
- **Breadcrumbs** — per-route trail rendered above the page title in the sticky TopBar.
- **DateField** — datetime input with custom calendar popover (month nav, today/selection styling, time input disabled until a date is picked).
- **Select**, **Modal** (sticky footer + close X), **Button**, **Avatar**, **Badge**, **Card**, **Field**, **Input**, **Textarea**, **Spinner**, **ConfirmDialog**.

### Search (⌘K)
Fullscreen search modal opens from the sidebar or via `Cmd/Ctrl+K`. Stub implementation with mocked results across polls/people/pages — wired to the real router so selecting a row navigates. Real search backend is a TODO.

### CI/CD
- [`deploy.yml`](.github/workflows/deploy.yml) — on push to `main`, builds backend + frontend Docker images, pushes to GHCR, SSHs into the testing VPS, and `docker compose up -d`. Frontend is rebuilt with `VITE_API_BASE_URL=https://api.andreevxdr.ru/v1`.
- [`vercel-preview.yml`](.github/workflows/vercel-preview.yml) — on every PR open/sync/reopen, builds the frontend via Vercel CLI, deploys to a Vercel Preview environment, aliases it to `pr-<n>.survey.andreevxdr.ru`, and posts a sticky comment with the URL. On PR close, the comment is updated to indicate teardown.

### Testing
- Backend: Jest unit + e2e suites (auth, polls, responses, analytics, admin).
- Frontend: Vitest component tests for primitives + hooks.
- Playwright flows under [`frontend/tests/`](frontend/tests/): full lifecycle (register → create poll → anonymous submit → see in analytics) and admin promotion (admin promotes a user → that user sees the Admin Panel link after re-login).

---

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs
- Compose's Postgres: host port `5433` (avoids conflict with a local Postgres on `5432`).

Seed admin is created on first boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@polls.local` / `admin`).

## Local-without-Docker

Requires Node 20 (`.nvmrc`) and a Postgres on `localhost:5432` with a `polls` role + `survey_app` database.

```bash
# One-time DB setup (as a superuser):
#   CREATE ROLE polls WITH LOGIN PASSWORD 'polls';
#   ALTER USER polls CREATEDB;          -- needed for Prisma shadow DB on dev
#   CREATE DATABASE survey_app OWNER polls;

npm install
npm run db:migrate
npm run db:seed
npm run dev          # backend (:3000) + frontend (:5173) in parallel
```

## Scripts (from repo root)

| Script | What |
|---|---|
| `npm run dev` | Backend + frontend in dev mode |
| `npm test` | Jest (backend) + Vitest (frontend) |
| `npm run test:e2e` | Playwright (runs against the live compose stack) |
| `npm run check:ts` | TS check both workspaces |
| `npm run lint` | ESLint both workspaces |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed first admin |
| `npm run gen:api` | Export OpenAPI spec → regenerate `frontend/src/api/schema.ts` |

## Tech stack

**Backend:** NestJS, Prisma, PostgreSQL 16, JWT (access + refresh) in `HttpOnly` cookies, `class-validator`, `@nestjs/swagger`.

**Frontend:** React 19, Vite, Tailwind, TanStack Query, `openapi-fetch`, react-router-dom, react-hook-form + zod, sonner.

**Infra:** Docker Compose (dev + prod), GHCR (image registry), SSH-deploy to VPS (production), Vercel (PR previews).

## Generated artifacts in version control

- `openapi.json` — API contract exported from NestJS Swagger.
- `frontend/src/api/schema.ts` — TS types generated from `openapi.json` by `openapi-typescript`.

Both are committed so PRs visibly carry contract changes.

## Project layout

```
backend/           NestJS app + Prisma schema + e2e tests
frontend/          React + Vite app
  src/components/primitives/   Custom Tailwind UI primitives
  src/layouts/DashboardShell/  TopBar, Sidebar, modals
  src/routes/                  Route components
  tests/                       Playwright flows
docs/              Specs and implementation plans
.github/workflows/ deploy.yml (prod) + vercel-preview.yml (PR previews)
```
