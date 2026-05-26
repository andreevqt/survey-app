# Survey App

Full-stack polling platform. Monorepo with NestJS + Prisma backend and React + Vite frontend, orchestrated with Docker Compose.

Spec: [`docs/superpowers/specs/2026-05-26-survey-app-design.md`](docs/superpowers/specs/2026-05-26-survey-app-design.md)

Implementation plans:
- Plan 1 — Foundation + Auth: [`docs/superpowers/plans/2026-05-26-foundation-and-auth.md`](docs/superpowers/plans/2026-05-26-foundation-and-auth.md)
- Plan 2 — Polls + Public Responses: [`docs/superpowers/plans/2026-05-26-polls-and-responses.md`](docs/superpowers/plans/2026-05-26-polls-and-responses.md)

## What works today

After Plan 1 + Plan 2:

- Registration / login / logout / silent refresh (JWT access + refresh in `HttpOnly` cookies).
- Owner dashboard at `/dashboard` — list of your polls with response counts, badges, Activate/Deactivate, Copy link, Edit, Delete.
- Create / edit poll at `/polls/new` and `/polls/:id/edit` — single-choice, multiple-choice, and free-text questions; metadata (title, description, visibility, expires-at, active) and structure both editable until the first response lands.
- Once any response exists, the poll's structure is **locked**: only metadata is editable. The form shows a banner and the structural fields are disabled. The backend re-enforces the same rule with `409 POLL_LOCKED_HAS_RESPONSES`.
- Public poll page at `/p/:slug` — anonymous respondents answer once per browser. Cookie-based deduplication: the same browser submitting twice gets `409 ALREADY_RESPONDED`. Inactive or expired polls render read-only ("This poll has closed").

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs
- Compose's Postgres: host port `5433` (so it doesn't conflict with a local Postgres on `5432`).

A seed admin is created on first boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@polls.local` / `admin`).

## Local-without-Docker

Requires Node 20 (see `.nvmrc`) and a Postgres on `localhost:5432` with a `polls` role and `survey_app` database.

```bash
# One-time DB setup (as a superuser):
#   CREATE ROLE polls WITH LOGIN PASSWORD 'polls';
#   ALTER USER polls CREATEDB;          -- needed for Prisma shadow DB on dev
#   CREATE DATABASE survey_app OWNER polls;

npm install
npm run db:migrate
npm run db:seed
npm run dev          # runs backend (:3000) + frontend (:5173) in parallel
```

## Scripts (run from the repo root)

| Script | What |
|---|---|
| `npm run dev` | Backend + frontend in dev mode |
| `npm test` | Jest (backend) + Vitest (frontend) |
| `npm run test:e2e` | Playwright (added in Plan 3) |
| `npm run check:ts` | TS check both workspaces |
| `npm run lint` | ESLint both workspaces |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed first admin |
| `npm run gen:api` | Export OpenAPI spec → regenerate `frontend/src/api/schema.ts` |

## Tech stack at a glance

Backend: NestJS, Prisma, PostgreSQL 16, JWT (access + refresh) in httpOnly cookies, class-validator, @nestjs/swagger.
Frontend: React 19, Vite, Tailwind, TanStack Query, `openapi-fetch`, react-router-dom, react-hook-form + zod, sonner.

## Generated artifacts in version control

- `openapi.json` — the API contract exported from NestJS Swagger.
- `frontend/src/api/schema.ts` — TS types generated from `openapi.json` by `openapi-typescript`.

Both are committed so PRs visibly carry contract changes.
