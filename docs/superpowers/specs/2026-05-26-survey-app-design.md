# Survey App — Design Spec

**Date:** 2026-05-26
**Status:** Approved for implementation planning
**Reference repo:** https://github.com/andreevqt/polls — same skeleton (monorepo, Docker, NestJS+React stack); the `design/` folder in this repo is the visual baseline.

---

## 1. Goal and scope

### Goal

Build a full-stack polling platform that mirrors the visual surface in `design/` (landing, auth, user dashboard, poll-taking, owner analytics, admin shell, admin users, admin analytics) with persistence, real auth, and Docker-based local development. Same skeleton as `andreevqt/polls`: npm monorepo, NestJS + Prisma + PostgreSQL backend, React + Vite frontend, Docker Compose.

### In scope for v1

- Account registration + login (email + password).
- Polls owned by a user. Question types: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TEXT`. Each question has an `isRequired` flag.
- Public poll page at `/p/:slug` (nanoid slug) accepting anonymous responses with cookie-based deduplication.
- Per-poll analytics for the owner (total responses + per-question breakdown bars).
- Admin panel (admin-only routes inside a separate `AdminLayout`): users management, system-wide analytics.
- Poll lifecycle: `isActive` owner-controlled toggle, `expiresAt` after which the public view becomes read-only.
- Edit rules: title / description / `isActive` / `expiresAt` / `visibility` are always editable; questions and options become immutable once a poll has at least one response.
- Seeded first admin from env vars; subsequent admins promoted via the admin Users table.

### Non-goals for v1

- Email verification, password reset, OAuth, magic links (no UI in the design).
- Responses-over-time chart (Recharts timeline) — design README explicitly omits it.
- i18n — English only.
- Public poll discovery — `visibility` is stored but behaviorally inert; both PUBLIC and PRIVATE polls are link-gated. The field is stored so discovery can be added later without a migration.
- Production deployment manifests — Docker Compose is for local dev only.
- Rate limiting on submissions — explicit non-goal; cookie dedup is for honest deduplication, not abuse prevention. `@nestjs/throttler` can be added later if needed.
- An admin "system dashboard" stats page (the `AdminDashboard` component in the design). Admins see the same `/dashboard` as users. The admin shell exists only as a layout for admin management pages (Users, Analytics).

---

## 2. High-level architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Browser (frontend SPA)     │         │  NestJS API                  │
│  React 19 + Vite            │         │  Modules: auth, users, polls,│
│  TanStack Query + Router    │◄───────►│   responses, analytics       │
│  openapi-fetch client       │  HTTPS  │  Guards: JwtAccess, AdminRole│
│  httpOnly cookies for auth  │ (cookies)│  Swagger at /api/docs       │
└─────────────────────────────┘         └──────────────┬───────────────┘
                                                       │ Prisma
                                                       ▼
                                              ┌────────────────┐
                                              │  PostgreSQL    │
                                              └────────────────┘
```

Three runtime services orchestrated by `docker-compose.yml`:

1. **`db`** — Postgres 16, named volume `db-data`, healthcheck via `pg_isready`.
2. **`backend`** — NestJS on `:3000`, runs `prisma migrate deploy` and the seed on startup, exposes Swagger at `/api/docs` and the spec JSON at `/api/docs-json`. Reads `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` from env.
3. **`frontend`** — Vite dev server on `:5173`, proxies `/api/*` to the backend.

Cross-cutting concerns:

- **Auth.** Short-lived JWT access token (15 min) + rotating refresh token (7 days), both delivered as `HttpOnly; Secure; SameSite=Lax; Path=/api/v1` cookies. Frontend never touches token values directly.
- **Anonymous responses.** Per-poll `respondent_<pollId>` UUID cookie scoped to `/api/v1/public/polls/<slug>`. `(pollId, respondentCookie)` is the dedup key.
- **OpenAPI client.** NestJS Swagger metadata is exported to `openapi.json` (committed). `openapi-typescript` generates `frontend/src/api/schema.ts` (committed). `openapi-fetch` provides a typed fetch wrapper used by all TanStack Query calls. CI fails the build on uncommitted spec drift.
- **Cross-origin / CORS.** In dev, Vite's proxy forwards `/api/*` from `localhost:5173` to the backend container, keeping the frontend and API same-origin in the browser — no CORS preflight, cookies just flow. The backend still enables CORS with `credentials: true` and `origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'` as a fallback for any deployment where the proxy isn't used.

---

## 3. Repo layout

```
survey-app/
├── package.json              # workspaces: ["backend","frontend"]
├── package-lock.json
├── docker-compose.yml
├── .nvmrc                    # Node 20
├── .env.example
├── .gitignore
├── README.md
├── CLAUDE.md
├── openapi.json              # generated, committed
├── design/                   # existing UI kit (unchanged)
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-26-survey-app-design.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile            # multi-stage: dev / build / prod
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── common/
│       │   ├── guards/        # JwtAccessGuard, JwtRefreshGuard, AdminRoleGuard, OptionalJwtGuard
│       │   ├── decorators/    # @CurrentUser(), @Public()
│       │   ├── filters/       # HttpExceptionFilter (uniform error shape)
│       │   └── pipes/         # global ValidationPipe configuration
│       ├── prisma/            # PrismaService
│       ├── auth/              # controller, service, strategies (jwt-access, jwt-refresh)
│       ├── users/             # self + admin user management
│       ├── polls/             # owner CRUD + admin-wide list
│       ├── responses/         # anonymous submission, cookie dedup
│       └── analytics/         # per-poll + admin-wide
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── index.html
    ├── Dockerfile            # multi-stage: dev / build / prod
    ├── playwright.config.ts
    ├── e2e/
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router.tsx
        ├── api/
        │   ├── schema.ts     # GENERATED from openapi.json, committed
        │   ├── client.ts     # openapi-fetch instance with credentials: 'include'
        │   ├── queries/      # TanStack Query hooks per resource
        │   └── mutations/
        ├── auth/             # AuthProvider, useAuth, RequireAuth, RequireAdmin
        ├── components/
        │   └── primitives/   # Button, Badge, Avatar, Input, Field, Spinner, StatCard, Card, Dialog, ConfirmDialog
        ├── layouts/
        │   ├── MainLayout/
        │   └── AdminLayout/  # dark sidebar, used by admin routes only
        ├── routes/
        │   ├── landing/
        │   ├── auth/
        │   ├── dashboard/    # the single personal dashboard for users and admins
        │   ├── polls/        # /polls/new, /polls/:id/edit, /polls/:id/analytics
        │   ├── poll/         # /p/:slug (public)
        │   └── admin/
        │       ├── users/
        │       └── analytics/
        ├── forms/
        │   └── schemas/      # zod schemas for client-side form validation
        ├── styles/
        │   ├── tokens.css    # ported from design/styles.css custom properties
        │   └── tailwind.css
        ├── lib/              # formatDate, slugify, etc.
        └── test/             # msw handlers, vitest setup
```

Notes:

- `design/` is reference material, untouched. Tokens are ported into `frontend/src/styles/tokens.css`; components are rebuilt in TSX with real props/state, Tailwind classes, and TanStack Query wiring.
- No `packages/` workspace — frontend types come from the generated `schema.ts`.
- `responses/` is its own backend module because anonymous submission has a different auth surface (no JWT, cookie-based dedup) than poll CRUD.
- The dark `AdminSidebar` ships with only `Users` and `Analytics` nav items in v1; the design kit's `Polls` and `System` items are deferred.

---

## 4. Data model

```prisma
// prisma/schema.prisma

enum Role {
  USER
  ADMIN
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  TEXT
}

enum Visibility {
  PUBLIC
  PRIVATE
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  polls        Poll[]
  refreshTokens RefreshToken[]

  @@index([role])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jtiHash   String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model Poll {
  id          String     @id @default(cuid())
  slug        String     @unique          // nanoid(10) — random short ID
  ownerId     String
  owner       User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title       String
  description String?
  visibility  Visibility @default(PRIVATE)
  isActive    Boolean    @default(true)
  expiresAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  questions   Question[]
  responses   Response[]

  @@index([ownerId])
  @@index([createdAt])
}

model Question {
  id         String       @id @default(cuid())
  pollId     String
  poll       Poll         @relation(fields: [pollId], references: [id], onDelete: Cascade)
  order      Int
  type       QuestionType
  text       String
  isRequired Boolean      @default(false)
  options    Option[]
  answers    Answer[]

  @@unique([pollId, order])
  @@index([pollId])
}

model Option {
  id            String         @id @default(cuid())
  questionId    String
  question      Question       @relation(fields: [questionId], references: [id], onDelete: Cascade)
  order         Int
  text          String
  answerOptions AnswerOption[]

  @@unique([questionId, order])
  @@index([questionId])
}

model Response {
  id                String   @id @default(cuid())
  pollId            String
  poll              Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  respondentCookie  String                       // server-issued UUID; not PII
  createdAt         DateTime @default(now())
  answers           Answer[]

  @@unique([pollId, respondentCookie])
  @@index([pollId, createdAt])
}

model Answer {
  id              String         @id @default(cuid())
  responseId      String
  response        Response       @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question       @relation(fields: [questionId], references: [id], onDelete: Restrict)
  textValue       String?                        // populated for TEXT; null otherwise
  selectedOptions AnswerOption[]

  @@unique([responseId, questionId])
  @@index([questionId])
}

model AnswerOption {
  answerId String
  answer   Answer @relation(fields: [answerId], references: [id], onDelete: Cascade)
  optionId String
  option   Option @relation(fields: [optionId], references: [id], onDelete: Restrict)

  @@id([answerId, optionId])
  @@index([optionId])
}
```

### Why the join table for `AnswerOption`

`MULTIPLE_CHOICE` questions need multiple selected options per response, each pointing at a real `Option` row. Alternatives considered and rejected:

- **`String[]` on `Answer`.** Postgres arrays can't carry foreign keys, so an option ID inside the array could outlive its `Option` row. Analytics would need `unnest()`. Cascades wouldn't run.
- **One `Answer` row per selected option.** Breaks the `(responseId, questionId)` invariant and leaves no clean home for `TEXT` `textValue`.

The join table buys per-option FK integrity, working cascades, and trivial analytics queries (`SELECT optionId, COUNT(*) FROM "AnswerOption" GROUP BY optionId`).

### Other deliberate choices

- **`onDelete: Restrict` on `Answer → Question` and `AnswerOption → Option`.** Belt-and-suspenders for the structure-lock rule enforced in the service layer.
- **`respondentCookie` is a server-issued UUID v4**, not the client IP or a fingerprint. Not PII; user can wipe it by clearing cookies.
- **No denormalized `responseCount` on `Poll` in v1** — Prisma `count()` is fine at our scale. Can be added later with a migration if dashboards get slow.
- **`visibility` defaults to `PRIVATE`.** Both values behave identically in v1.

---

## 5. API surface

Base path: `/api/v1`. Inputs validated by `class-validator` DTOs decorated for `@nestjs/swagger`. Two annotation passes per endpoint: request DTO + response DTO. Uniform error shape (`{ statusCode, code, message, details? }`) emitted by a global `HttpExceptionFilter`.

```
Auth                                  Guard
─────────────────────────────────────────────────────────
POST   /auth/register                 -
POST   /auth/login                    -
POST   /auth/logout                   JwtAccess
POST   /auth/refresh                  JwtRefresh (cookie)
GET    /auth/me                       JwtAccess

Polls (owner)                         Guard
─────────────────────────────────────────────────────────
GET    /polls                         JwtAccess
POST   /polls                         JwtAccess
GET    /polls/:id                     JwtAccess + owner
PATCH  /polls/:id                     JwtAccess + owner
DELETE /polls/:id                     JwtAccess + owner
PATCH  /polls/:id/active              JwtAccess + owner
GET    /polls/:id/analytics           JwtAccess + owner

Public poll                           Guard
─────────────────────────────────────────────────────────
GET    /public/polls/:slug            -
POST   /public/polls/:slug/responses  -

Admin                                 Guard
─────────────────────────────────────────────────────────
GET    /admin/users                   AdminRole
PATCH  /admin/users/:id/role          AdminRole
POST   /admin/users/bulk-delete       AdminRole
GET    /admin/users/export.csv        AdminRole
GET    /admin/analytics               AdminRole
```

### Edit-rule enforcement

`PATCH /polls/:id` accepts the same body shape as `POST /polls`. The service computes `responseCount`:

- `0` → any field may change.
- `> 0` → only `title`, `description`, `expiresAt`, `visibility`, `isActive` may change. Any structural diff returns `409 Conflict, code: "POLL_LOCKED_HAS_RESPONSES"`.

`PATCH /polls/:id/active` exists separately so the dashboard's toggle button doesn't need the full poll body.

### Public submission flow

- `GET /public/polls/:slug` returns `{ id, title, description, expiresAt, questions, closed }`. `closed` is `true` if `isActive === false` or `expiresAt < now()`. Status is always `200` for a real poll (or `404` if the slug doesn't exist).
- `POST /public/polls/:slug/responses`:
  - Re-checks `closed` → `403 POLL_CLOSED` on stale clients.
  - Reads or issues the `respondent_<pollId>` cookie.
  - Inserts `Response` row; unique-constraint violation → `409 ALREADY_RESPONDED`.
  - Validates answers against the poll's questions (see flow chart below) and inserts `Answer` + `AnswerOption` rows in one transaction.
  - Returns `201 { submittedAt }`.

### Answer validation rules (server-side, in `ResponsesService`)

- All `isRequired` questions must have an answer.
- Each answer's `questionId` must belong to this poll.
- For `SINGLE_CHOICE`: exactly one `optionId`, from this question's options.
- For `MULTIPLE_CHOICE`: at least one `optionId`, all from this question's options.
- For `TEXT`: `textValue` non-empty if `isRequired`; may be omitted otherwise.

Validation lives in the service (not the DTO) because the rules depend on the loaded poll structure.

### Pagination

List endpoints (`GET /polls`, `GET /admin/users`) accept `?page=1&pageSize=20` and return `{ items, total, page, pageSize }`. Page-based (not cursor) for simpler table UIs.

### OpenAPI generation pipeline

- `@nestjs/swagger` builds the spec at runtime under `/api/docs-json`.
- Backend script `spec:export` boots Nest with `SWAGGER_ONLY=1`, writes `../openapi.json`, exits without listening on a port.
- Root script `gen:api` runs `spec:export` then `openapi-typescript ./openapi.json -o ./frontend/src/api/schema.ts`.
- Both `openapi.json` and `schema.ts` are committed.
- CI runs `npm run gen:api && git diff --exit-code` to fail on uncommitted spec drift.

---

## 6. Auth flow

### Token shapes

- `access_token`: JWT signed with `JWT_ACCESS_SECRET`, 15 min TTL. Payload: `{ sub: userId, role }`.
- `refresh_token`: JWT signed with `JWT_REFRESH_SECRET`, 7 day TTL. Payload: `{ sub: userId, jti }`.
- The refresh `jti` is bcrypt-hashed and stored in `RefreshToken` keyed by `(userId, jti)`. Refresh is single-use ("rotation"): verify JWT → look up hash → compare → delete old row → issue new pair. A stolen refresh token stops working as soon as the legitimate user refreshes once.

### Cookie attributes

Both cookies: `HttpOnly; SameSite=Lax; Path=/api/v1`. `Secure` is set only when `NODE_ENV === 'production'` so plain HTTP dev works.

### Login → refresh → logout

```
Browser                                  NestJS
   │ POST /auth/login {email, pwd}         │
   ├───────────────────────────────────────►│  bcrypt.compare → sign access + refresh
   │      200 OK, body: { user }            │  persist refresh jtiHash
   │  Set-Cookie: access_token;             │
   │  Set-Cookie: refresh_token;            │
   │  ◄─────────────────────────────────────┤
   │                                        │
   │ GET /polls (access cookie)             │
   ├───────────────────────────────────────►│  JwtAccessStrategy verifies → req.user
   │  ◄─────────────────────────────────────┤  200 OK
   │                                        │
   │ ... 15 min later, access expires ...   │
   │                                        │
   │ GET /polls → 401                       │
   │  ◄─────────────────────────────────────┤
   │                                        │
   │ openapi-fetch middleware catches 401   │
   │ POST /auth/refresh (refresh cookie)    │
   ├───────────────────────────────────────►│  verify + compare hash → rotate → new pair
   │      200 OK, new Set-Cookie pair       │
   │  ◄─────────────────────────────────────┤
   │ retry original GET /polls              │
   ├───────────────────────────────────────►│  200 OK
```

`POST /auth/logout` deletes the `RefreshToken` row for the presented `jti` and clears both cookies with `Max-Age=0`.

### Role changes invalidate sessions

When an admin promotes or demotes a user, the user's `RefreshToken` rows are deleted, forcing a fresh login (with the new role baked into the new access token). The currently-issued 15-min access token still carries the old role until it expires — acceptable for v1; documented as a known tradeoff. "Force re-login on role change" is the same operation as "logout everywhere": `DELETE FROM RefreshToken WHERE userId = ?`.

### Frontend wiring

- `openapi-fetch` configured with `credentials: 'include'`.
- A middleware: on `401` from any non-auth endpoint, fire `POST /auth/refresh` and retry once. If refresh also fails, dispatch to the auth store → redirect to `/login`.
- `useAuth()` backed by `useQuery(['auth', 'me'])` with `staleTime: Infinity`.
- `<RequireAuth>` and `<RequireAdmin>` route guards consume `useAuth()` and redirect on miss.

---

## 7. Frontend structure

### Routing

```
/                              MainLayout > LandingScreen
/login                         MainLayout > LoginScreen
/register                      MainLayout > RegisterScreen
/p/:slug                       MainLayout > PollScreen (public)

<RequireAuth>
  /dashboard                   MainLayout > DashboardScreen
  /polls/new                   MainLayout > PollFormScreen
  /polls/:id/edit              MainLayout > PollFormScreen
  /polls/:id/analytics         MainLayout > OwnerAnalyticsScreen

<RequireAdmin>
  /admin/users                 AdminLayout > UsersScreen
  /admin/analytics             AdminLayout > SystemAnalyticsScreen
```

The "Admin Panel" button on `DashboardScreen` (shown when `user.role === 'ADMIN'`) navigates to `/admin/users`. The admin sidebar's "Dashboard" link routes back to `/dashboard`.

### State management

- **Server state:** TanStack Query exclusively. Query keys: `['polls']`, `['polls', id]`, `['polls', id, 'analytics']`, `['admin', 'users', page]`, `['auth', 'me']`. Mutations invalidate by prefix.
- **Auth state:** thin `AuthContext` exposing `{ user, isLoading }`, backed by `useQuery(['auth', 'me'])`. Login / logout mutations call `queryClient.setQueryData(['auth', 'me'], ...)`.
- **Local state:** `useState` / `useReducer` for the poll form. No Redux or Zustand.

### Forms

- `react-hook-form` + `zod` for client-side validation. Schemas live in `src/forms/schemas/` (separate from anything the backend exposes — they validate input before it's sent).
- Poll form schema:
  - `title` 1–200 chars, `description` 0–1000.
  - `expiresAt` optional, must be future-dated.
  - `questions.length ≥ 1`.
  - Per question: `text` 1–500. `SINGLE_CHOICE` / `MULTIPLE_CHOICE` require `options.length ≥ 2`, each `text` 1–200. `TEXT` ignores options.
  - When editing and the server's `responseCount > 0`, structural fields render disabled with a "Locked — this poll has responses" banner.

### Styling

- **Tailwind 3.x.** `tailwind.config.ts` extends the theme from CSS custom properties in `frontend/src/styles/tokens.css` (ported verbatim from `design/styles.css`). `bg-indigo-600` resolves to the exact `--indigo-600` from the kit.
- Two-file CSS entry: `tokens.css` (custom properties + minimal resets) + `tailwind.css` (`@tailwind base/components/utilities`).
- No CSS modules, no styled-components. Tailwind classes everywhere.

### Component library

Primitives ported from `design/` into `src/components/primitives/`: `Button`, `Badge`, `Avatar`, `Input`, `Field`, `Spinner`, `StatCard`, `Card`, `Dialog`, `ConfirmDialog`. Each gets proper TS props, `forwardRef` where useful, and `__tests__/` for the non-trivial ones.

### Notifications

`sonner` for toasts. One `<Toaster />` mounted in `App.tsx`.

---

## 8. Anonymous responses and dedup

### Cookie

- Name: `respondent_<pollId>` (per-poll, so the same browser can answer different polls).
- Value: server-issued UUID v4.
- Attributes: `HttpOnly; Secure (prod only); SameSite=Lax; Path=/api/v1/public/polls/<slug>; Max-Age=31536000`.
- Issued on first `GET /public/polls/:slug` or `POST /public/polls/:slug/responses`. Reused if already present.

### Why HttpOnly + scoped Path

`HttpOnly` keeps the value out of JS reach. Scoped `Path` keeps the cookie off all other requests, minimizing header size and cross-feature leakage.

### Submission flow

```
POST /public/polls/:slug/responses
  ├── load poll by slug (404 if missing)
  ├── if poll.isActive=false OR expiresAt < now → 403 POLL_CLOSED
  ├── read or issue respondent_<pollId> cookie
  ├── INSERT Response (pollId, respondentCookie)
  │     ├── unique-constraint violation → 409 ALREADY_RESPONDED
  ├── validate answers against poll questions
  ├── INSERT Answer + AnswerOption rows in one transaction
  └── 201 { submittedAt }
```

### Edge cases

| Case | Behavior |
|---|---|
| Cookie present, Response row deleted | Next POST succeeds — the slot is free. |
| User clears cookies | They can submit again. Cookie dedup is best-effort, not security. |
| Owner submits to their own poll | Allowed. Counts as any respondent. |
| `expiresAt` passes between GET and POST | POST re-checks and returns `403 POLL_CLOSED`. |
| Poll deleted mid-submission | FK violation → `404`. No partial response recorded. |

---

## 9. Docker Compose and dev workflow

### `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: polls
      POSTGRES_USER: polls
      POSTGRES_PASSWORD: polls
    volumes:
      - db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U polls -d polls"]
      interval: 3s
      timeout: 3s
      retries: 20

  backend:
    build: { context: ./backend, target: dev }
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && npm run start:dev"
    environment:
      DATABASE_URL: postgresql://polls:polls@db:5432/polls
      JWT_ACCESS_SECRET: dev-access-secret-change-me
      JWT_REFRESH_SECRET: dev-refresh-secret-change-me
      ADMIN_EMAIL: admin@polls.local
      ADMIN_PASSWORD: admin
      NODE_ENV: development
      PORT: "3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports: ["3000:3000"]
    depends_on:
      db: { condition: service_healthy }

  frontend:
    build: { context: ./frontend, target: dev }
    command: npm run dev -- --host 0.0.0.0
    environment:
      VITE_API_BASE_URL: /api/v1                # served same-origin via Vite proxy
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports: ["5173:5173"]
    depends_on: [backend]

volumes:
  db-data:
```

### Dockerfiles

Multi-stage with a `dev` target used in compose. A `prod` stage is included for future use; production deployment is out of v1 scope.

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
CMD ["node", "dist/main.js"]
```

### Local-without-Docker path

Documented in README. Requires Node 20 (`.nvmrc`) and local Postgres on `:5432`. Steps:

1. `npm install` at root (workspaces).
2. `npm run db:migrate`.
3. `npm run db:seed`.
4. `npm run dev` (runs backend + frontend in parallel via `concurrently`).

### Root `package.json` scripts

```jsonc
{
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently -n api,web -c blue,magenta \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm --workspace backend run start:dev",
    "dev:frontend": "npm --workspace frontend run dev",
    "build": "npm --workspace backend run build && npm --workspace frontend run build",
    "test": "npm --workspace backend test && npm --workspace frontend test",
    "test:e2e": "npm --workspace frontend run test:e2e",
    "check:ts": "npm --workspace backend run check:ts && npm --workspace frontend run check:ts",
    "lint": "npm --workspace backend run lint && npm --workspace frontend run lint",
    "db:migrate": "npm --workspace backend run db:migrate",
    "db:seed": "npm --workspace backend run db:seed",
    "gen:api": "npm --workspace backend run spec:export && openapi-typescript ./openapi.json -o ./frontend/src/api/schema.ts"
  }
}
```

---

## 10. Testing strategy

### Backend — Jest, two layers

| Layer | What | How |
|---|---|---|
| Unit | Service methods with logic | Prisma client mocked via `jest-mock-extended`. |
| Integration | Controllers + guards + DB | Real NestJS app + real Postgres via `@testcontainers/postgresql`. One container shared across the suite; `beforeEach` truncates tables. |

Covered explicitly:

- `AuthService` — bcrypt comparison, refresh rotation, role-change session invalidation.
- `PollsService` — edit-lock rule, slug collision retry, owner scoping.
- `ResponsesService` — answer-shape validation, required-question enforcement, `POLL_CLOSED` vs `ALREADY_RESPONDED` precedence.
- `AdminRoleGuard` — `403` for non-admin, `401` for unauthenticated.
- One end-to-end happy path per controller (≈ 8–12 integration tests).

### Frontend — Vitest + RTL + Playwright

| Layer | What | How |
|---|---|---|
| Component | Primitives with logic + screens | Vitest + RTL. `msw` mocks the network boundary so real TanStack Query runs. |
| e2e | Critical user journeys | Playwright against the running compose stack. |

Covered explicitly:

- `PollFormScreen` — add/remove questions, switch question types, locked banner, validation errors.
- `QuestionRenderer` for each of the three types.
- `RequireAuth` / `RequireAdmin` redirect behavior.
- `openapi-fetch` middleware — 401-refresh-retry logic.
- Trivial display primitives (`Badge`, `Avatar`, `Spinner`) — no dedicated tests.

### Playwright e2e flows

1. Register → create a 3-question poll → log out → submit anonymous response → log back in → see it in analytics.
2. Anonymous user submits twice from the same browser → second is blocked.
3. Poll with `expiresAt` in the past → public view shows "closed".
4. Owner edits a poll with responses → structural fields disabled.
5. Admin promotes a user → that user sees the "Admin Panel" button after logging in.
6. Admin bulk-deletes users → CSV export reflects the deletion.

### CI (GitHub Actions)

1. `npm ci` at root.
2. `npm run check:ts`.
3. `npm run lint`.
4. `npm run gen:api && git diff --exit-code` — fail on spec drift.
5. `npm test` (Jest + Vitest).
6. `docker compose up -d --build && npm run test:e2e`. Tear down after.

No coverage threshold in CI. The targeted list above is what matters.

---

## 11. Defaulted decisions

Minor things settled without a dedicated question. Flag any to revise.

| Item | Default |
|---|---|
| `visibility` in v1 | Stored and editable; behaviorally inert. Both values link-gated. |
| Owner submitting to own poll | Allowed. Counts as any respondent. |
| Avatar | Initials only. No image upload. |
| Pagination | `?page=1&pageSize=20`, response `{ items, total, page, pageSize }`. |
| Sorting | `createdAt DESC` for lists. No user-facing sort controls in v1. |
| CSV export | Users only. Columns: `id, name, email, role, createdAt`. UTF-8 BOM. Streamed. |
| `description` rendering | Plain text. Newlines preserved via `whitespace-pre-line`. No Markdown. |
| `name` length | 1–80 chars. |
| Email casing | Lowercased before storage and lookup. |
| Time zone | UTC on the server. Frontend renders in local time via `Intl.DateTimeFormat`. |
| Analytics order | Questions in poll order; options in `order`, not by count. |

---

## 12. Stack summary

| Layer | Choice |
|---|---|
| Monorepo | npm workspaces |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL 16 |
| Backend auth | `@nestjs/jwt`, `@nestjs/passport` (jwt-access + jwt-refresh strategies), `bcryptjs`, `cookie-parser` |
| Backend validation | `class-validator` + `class-transformer` (NestJS-native, feeds Swagger) |
| Backend docs | `@nestjs/swagger` |
| Frontend | React 19, Vite, TypeScript |
| Frontend routing | `react-router-dom` v6 |
| Frontend data | TanStack Query, `openapi-fetch`, `openapi-typescript` (build-time codegen) |
| Frontend forms | `react-hook-form` + `zod` |
| Frontend styling | Tailwind 3.x with design tokens from `design/styles.css` |
| Toasts | `sonner` |
| Testing (backend) | Jest, `jest-mock-extended`, `@testcontainers/postgresql` |
| Testing (frontend) | Vitest, React Testing Library, `msw`, Playwright |
| Containers | Docker Compose (dev only in v1) |

---

## Appendix A — Environment variables

| Var | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://polls:polls@db:5432/polls` |
| `JWT_ACCESS_SECRET` | Sign access tokens | random 32+ bytes |
| `JWT_REFRESH_SECRET` | Sign refresh tokens | random 32+ bytes |
| `ADMIN_EMAIL` | Seeded admin email (created on first run if no users) | `admin@polls.local` |
| `ADMIN_PASSWORD` | Seeded admin password (bcrypted on seed) | `admin` (dev only) |
| `NODE_ENV` | `development` / `production` — toggles cookie `Secure` flag | `development` |
| `PORT` | Backend port | `3000` |
| `FRONTEND_ORIGIN` | CORS allow-list origin (used when the Vite proxy isn't fronting requests) | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Frontend API base path (same-origin via Vite proxy in dev) | `/api/v1` |

`.env.example` ships at the repo root with the dev defaults above (minus real secrets).

---

## Appendix B — Error code catalogue

Returned in the uniform error shape `{ statusCode, code, message, details? }`.

| HTTP | code | Where |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Any DTO validation failure |
| 401 | `UNAUTHENTICATED` | Missing / invalid access token |
| 401 | `REFRESH_INVALID` | Refresh token missing / expired / revoked |
| 403 | `FORBIDDEN` | Authenticated but not allowed (e.g. non-owner, non-admin) |
| 403 | `POLL_CLOSED` | Submission to inactive or expired poll |
| 404 | `NOT_FOUND` | Resource missing |
| 409 | `EMAIL_TAKEN` | Registration with existing email |
| 409 | `POLL_LOCKED_HAS_RESPONSES` | Structural edit attempted on a poll with responses |
| 409 | `ALREADY_RESPONDED` | Duplicate submission from same `(pollId, respondentCookie)` |
| 500 | `INTERNAL` | Catch-all |

---

## Appendix C — What ships from the design folder

| Design file / component | v1 destination | Notes |
|---|---|---|
| `design/styles.css` custom properties | `frontend/src/styles/tokens.css` | Verbatim port. |
| `Primitives.jsx` | `src/components/primitives/*.tsx` | Rebuilt with TS props, Tailwind classes, forwardRef. |
| `LandingScreen` | `routes/landing/` | |
| `LoginScreen`, `RegisterScreen`, `AuthCard` | `routes/auth/` | |
| `DashboardScreen`, `PollListItem` | `routes/dashboard/` | Same component for users and admins. |
| `QuestionRenderer`, `PollScreen` | `routes/poll/` | Public `/p/:slug`. |
| `AnalyticsView`, `QuestionAnalyticsCard` | `routes/polls/analytics/` + `routes/admin/analytics/` | Shared component used by owner and admin analytics. |
| `ConfirmDialog` | `src/components/primitives/ConfirmDialog.tsx` | |
| `AdminSidebar`, `AdminHeader`, `AdminShell` | `layouts/AdminLayout/` | Sidebar nav trimmed to Users + Analytics in v1. |
| `AdminUsersTable` | `routes/admin/users/` | Wired to paginated `GET /admin/users` + bulk delete + role select + CSV export. |
| `AdminDashboard` | **Dropped.** | Admins use the same `/dashboard` as users. |
| `favicon.svg`, `logo-mark.svg` | `frontend/public/` | |
| `Polls App.html` | Reference only. | Not copied. |
