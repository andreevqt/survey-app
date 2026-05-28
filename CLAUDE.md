# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

npm-workspaces monorepo with two workspaces — `backend/` (NestJS + Prisma) and `frontend/` (Vite + React). Run scripts from the repo root; they delegate via `npm --workspace`. See [README.md](README.md) for the feature catalog.

## Commands

```bash
# Dev (both workspaces in parallel)
npm run dev                       # backend on :3000, frontend on :5173

# Test
npm test                          # Jest (backend unit) + Vitest (frontend)
npm --workspace backend test -- src/auth/auth.service.spec.ts   # single backend test
npm --workspace frontend test -- src/components/primitives/Button   # single frontend test
npm --workspace backend run test:e2e   # backend e2e (testcontainers, see Gotchas)
npm run test:e2e                  # Playwright (needs the compose stack running)

# Checks
npm run check:ts                  # tsc --noEmit both workspaces
npm run lint                      # ESLint both workspaces

# DB
npm run db:migrate                # prisma migrate deploy
npm run db:seed                   # seeds first admin

# API contract regen — MUST run after any backend API change
npm run gen:api                   # exports openapi.json -> regenerates frontend/src/api/schema.ts
```

## Architecture — load-bearing parts

### Backend modules
[backend/src/app.module.ts](backend/src/app.module.ts) wires: `PrismaModule`, `AuthModule`, `PollsModule`, `ResponsesModule`, `AnalyticsModule`, `UsersModule`. Each module owns its controller/service/DTOs in `backend/src/<module>/`. Public-facing DTOs use `class-validator` + `@nestjs/swagger` decorators — those decorators feed `openapi.json`.

### API contract is generated
`backend/src/spec-export.ts` boots the Nest app and dumps Swagger → `openapi.json` at repo root → `openapi-typescript` produces `frontend/src/api/schema.ts`. Both files are committed so contract changes show up in PR diffs. The frontend uses `openapi-fetch` typed against `schema.ts` — any backend DTO change without `npm run gen:api` will desync types silently.

### Auth model
JWT access + refresh in `HttpOnly` cookies. Refresh tokens are single-use and rotated on use (revoked + replaced on every `/auth/refresh`). **Side effect:** mutating a user's role calls `revokeAllRefreshTokens(userId)` so that user must re-login for the new role to take effect — see `UsersService`/`AdminController`. Don't forget this when adding role-affecting mutations.

### Poll edit-lock
Once any response exists for a poll, structural fields (questions, options) are locked. Both layers enforce this:
- Frontend: [PollForm.tsx](frontend/src/routes/dashboard/PollForm/PollForm.tsx) disables fields based on `vm.locked` (computed in `usePollForm`).
- Backend: `PollsService` throws `409 POLL_LOCKED_HAS_RESPONSES` on structural updates when `responseCount > 0`.

When adding a new structural field, add it to **both** the lock predicate and the unlocked-fields whitelist; otherwise the field becomes uneditable forever or escapes the lock.

### Frontend primitive pattern
Every primitive in [frontend/src/components/primitives/](frontend/src/components/primitives/) follows the same layout:

```
<Name>/
  <Name>.tsx       # JSX + presentation; minimal logic
  types.ts         # Props interface, exported variants
  index.ts         # public re-exports
  hooks/use<Name>.ts   # ViewModel: state, handlers, derived values (when needed)
```

Use this pattern for any new primitive or feature component. ViewModel hooks return a `vm` object consumed by the component — keep JSX dumb. The `DataTable` primitive is the standard generic-table abstraction; reach for it before hand-rolling a `<table>`.

### Dashboard route-modal pattern
[DashboardShell.tsx](frontend/src/layouts/DashboardShell/DashboardShell.tsx) renders shared chrome (Sidebar, TopBar) and mounts modals based on `useMatch('/dashboard/...')`. PollFormModal, SettingsModal, and AnalyticsModal are all route-driven. Adding a new modal route requires (a) the `<Route>` in [router.tsx](frontend/src/router.tsx), (b) a `useMatch` + conditional mount in `DashboardShell.tsx`, and (c) a corresponding branch in [useTopBarMeta.ts](frontend/src/layouts/DashboardShell/TopBar/hooks/useTopBarMeta.ts) for title/subtitle/breadcrumbs.

### Form-modal pattern (lifted hook + form-id)
For form-based modals (see PollFormModal), the form's hook is called at **modal level**, not inside the inner form component. The submit button lives in `Modal`'s `footer` slot outside the `<form>`, linked via the `form="<id>"` HTML attribute. This lets the Modal own loading state + action buttons without prop-drilling.

### TopBar meta is route-driven
[useTopBarMeta.ts](frontend/src/layouts/DashboardShell/TopBar/hooks/useTopBarMeta.ts) computes `{ title, subtitle, showNewPollButton, breadcrumbs }` per route via a chain of `useMatch` checks. New dashboard routes must be added here or they'll render the fallback title.

### Frontend ↔ backend wiring
Vite dev proxies `/api` → `http://localhost:3000` ([vite.config.ts](frontend/vite.config.ts)). In production builds, the frontend reads `import.meta.env.VITE_API_BASE_URL` (absolute URL) with `/api/v1` fallback — see [frontend/src/api/client.ts](frontend/src/api/client.ts). Setting `VITE_API_BASE_URL` at build time changes the deployed bundle's API target.

### CI/CD
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — push to `main` builds Docker images, pushes to GHCR, SSHes into the VPS, runs `docker compose up -d`.
- [.github/workflows/vercel-preview.yml](.github/workflows/vercel-preview.yml) — per-PR Vercel preview; alias-deploys to `pr-<n>.survey.andreevxdr.ru` and sticky-comments the URL on the PR.

## Gotchas

- **Backend e2e is bound to Colima.** `backend/package.json` hardcodes `DOCKER_HOST=unix:///Users/andreevxdr/.colima/default/docker.sock` for testcontainers. On a different machine/user/Docker setup, override `DOCKER_HOST` in the shell before running.
- **Always regen the API contract.** After any backend controller/DTO change: `npm run gen:api`. Forgetting this is the #1 cause of frontend type drift.
- **`.vercel/` is gitignored** and contains `project.json` (linked via `vercel link`). Don't commit it.
- **`vercel env add` defaults to sensitive on Preview/Production.** Sensitive vars are hidden from `vercel env pull` AND not injected into Vite builds. Always pass `--no-sensitive` for `VITE_*` keys (their values end up public in the bundle anyway).
- **Postgres in compose runs on host port `5433`** to avoid colliding with a local `5432` Postgres.
- **Role mutations invalidate refresh tokens** — when working on auth or admin endpoints, remember the affected user must re-login.
- **Free-text analytics provider** — `POST /polls/:pollId/questions/:questionId/analyze` calls DeepSeek (`https://api.deepseek.com`) when `DEEPSEEK_API_KEY` is set; with the key unset (CI, fresh clones), it falls back to a deterministic mock so the UI still renders something sensible. Optional `DEEPSEEK_MODEL` overrides `deepseek-chat`. Provider errors surface as `502 AI_PROVIDER_ERROR` and the frontend shows the red error panel.
