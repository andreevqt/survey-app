# Foundation + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the survey-app monorepo (npm workspaces + Docker), Prisma + Postgres, the NestJS auth module (register / login / logout / refresh / me) with JWT-in-httpOnly-cookies + refresh rotation, the OpenAPI codegen pipeline, and the React frontend scaffold with auth screens and route guards. End state: a working "register → login → land on empty dashboard → refresh → logout" loop runs via `docker compose up`.

**Architecture:** Two npm workspaces (`backend`, `frontend`) under a root `package.json`. Backend is NestJS + Prisma + PostgreSQL; frontend is React 19 + Vite + Tailwind + TanStack Query + `openapi-fetch`. Backend exposes Swagger; a build script writes `openapi.json` and runs `openapi-typescript` to generate committed frontend types. Auth uses Passport JWT strategies with two cookies (access 15m, refresh 7d, rotated single-use). Frontend talks to the backend same-origin via Vite's `/api` proxy in dev.

**Tech Stack:** Node 20, TypeScript, NestJS 10, Prisma 5, PostgreSQL 16, `@nestjs/passport` + `@nestjs/jwt`, `class-validator` + `class-transformer`, `@nestjs/swagger`, `bcryptjs`, `cookie-parser`, React 19, Vite 5, Tailwind 3, react-router-dom 6, TanStack Query 5, `openapi-fetch`, `openapi-typescript`, react-hook-form, zod, sonner, Jest, `jest-mock-extended`, Vitest, React Testing Library, msw.

**Source spec:** `docs/superpowers/specs/2026-05-26-survey-app-design.md` — Sections 1–7, 9, 12 and Appendices A–B are the load-bearing pieces for this plan.

---

## File Structure

This plan creates these files. Tasks below each touch one or a few of them.

```
survey-app/
├── package.json                                  # T01 — root workspaces, scripts
├── package-lock.json                             # T01 — npm install output
├── .nvmrc                                        # T01
├── .gitignore                                    # T01
├── .env.example                                  # T01
├── README.md                                     # T01 (skeleton), T31 (quickstart)
├── docker-compose.yml                            # T30
├── openapi.json                                  # T16 — generated, committed
│
├── backend/
│   ├── package.json                              # T02
│   ├── tsconfig.json                             # T02
│   ├── nest-cli.json                             # T02
│   ├── Dockerfile                                # T17 — multi-stage
│   ├── jest.config.ts                            # T02
│   ├── test/jest-e2e.json                        # T15
│   ├── prisma/
│   │   ├── schema.prisma                         # T03 — User + RefreshToken + Role
│   │   ├── seed.ts                               # T05
│   │   └── migrations/                           # T03 — generated
│   └── src/
│       ├── main.ts                               # T02 (hello), T06 (CORS+cookies+swagger+filter)
│       ├── app.module.ts                         # T02, T04, T14
│       ├── spec-export.ts                        # T16 — Swagger-only boot
│       ├── prisma/
│       │   ├── prisma.service.ts                 # T04
│       │   └── prisma.module.ts                  # T04
│       ├── common/
│       │   ├── filters/http-exception.filter.ts  # T06
│       │   ├── decorators/
│       │   │   ├── current-user.decorator.ts     # T10
│       │   │   └── public.decorator.ts           # T10
│       │   └── guards/
│       │       ├── jwt-access.guard.ts           # T10
│       │       └── jwt-refresh.guard.ts          # T10
│       └── auth/
│           ├── auth.module.ts                    # T14
│           ├── auth.controller.ts                # T14
│           ├── auth.service.ts                   # T11-T13
│           ├── auth.service.spec.ts              # T11-T13
│           ├── auth.controller.e2e-spec.ts       # T15
│           ├── dto/
│           │   ├── register.dto.ts               # T07
│           │   ├── login.dto.ts                  # T07
│           │   └── auth-response.dto.ts          # T07
│           ├── strategies/
│           │   ├── jwt-access.strategy.ts        # T09
│           │   └── jwt-refresh.strategy.ts       # T09
│           └── tokens.service.ts                 # T08 — sign / verify / cookie helpers
│
└── frontend/
    ├── package.json                              # T18
    ├── tsconfig.json                             # T18
    ├── tsconfig.node.json                        # T18
    ├── vite.config.ts                            # T18 — /api proxy
    ├── tailwind.config.ts                        # T19
    ├── postcss.config.js                         # T19
    ├── index.html                                # T18
    ├── Dockerfile                                # T29 — multi-stage
    ├── vitest.config.ts                          # T18
    └── src/
        ├── main.tsx                              # T18
        ├── App.tsx                               # T24, T28
        ├── router.tsx                            # T24
        ├── api/
        │   ├── schema.ts                         # T16 — GENERATED, committed
        │   ├── client.ts                         # T21 — openapi-fetch instance
        │   └── refresh-middleware.ts             # T21
        ├── auth/
        │   ├── AuthProvider.tsx                  # T22
        │   ├── useAuth.ts                        # T22
        │   ├── RequireAuth.tsx                   # T23
        │   └── RequireAdmin.tsx                  # T23
        ├── components/primitives/
        │   ├── Button.tsx                        # T20
        │   ├── Input.tsx                         # T20
        │   ├── Field.tsx                         # T20
        │   ├── Spinner.tsx                       # T20
        │   ├── Card.tsx                          # T20
        │   ├── Avatar.tsx                        # T20
        │   └── Badge.tsx                         # T20
        ├── layouts/MainLayout/
        │   ├── MainLayout.tsx                    # T24
        │   └── Header.tsx                        # T24
        ├── routes/
        │   ├── landing/LandingScreen.tsx         # T25
        │   ├── auth/
        │   │   ├── LoginScreen.tsx               # T26
        │   │   ├── RegisterScreen.tsx            # T27
        │   │   └── AuthCard.tsx                  # T26 — shared frame
        │   └── dashboard/DashboardScreen.tsx     # T28 — empty placeholder
        ├── forms/schemas/
        │   ├── login.schema.ts                   # T26
        │   └── register.schema.ts                # T27
        ├── styles/
        │   ├── tokens.css                        # T19 — ported from design/styles.css
        │   └── tailwind.css                      # T19
        ├── test/setup.ts                         # T18
        └── test/msw-handlers.ts                  # T22
```

---

## Conventions used in this plan

- **Commits are conventional commits** (`feat:`, `chore:`, `test:`, `fix:`, `docs:`). The repo is initialized in Task 1.
- **Tests live next to source** for backend (`*.spec.ts`); frontend uses `*.test.tsx` under `__tests__/` or co-located.
- Run commands from the **repo root** unless explicitly noted (cd is shown). `npm --workspace <name> ...` is the idiomatic root-level call.
- When a step says "Expected: PASS" or "Expected: FAIL", that's a real assertion — verify it before moving on.
- Working tree must be clean before starting; tasks are bite-sized and committed as you go.

---

## Task 1: Repo scaffolding — root package.json, .nvmrc, .gitignore, .env.example, README skeleton

**Files:**
- Create: `package.json`
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Init the git repo and Node version pin**

Run from the repo root:
```bash
git init
echo "20" > .nvmrc
```
Expected: `.git/` exists and `.nvmrc` contains `20`.

- [ ] **Step 2: Create `.gitignore`**

Create `.gitignore` with this exact content:
```gitignore
node_modules/
dist/
build/
coverage/
.env
.env.local
*.log
.DS_Store
.idea/
.vscode/
playwright-report/
test-results/
```

- [ ] **Step 3: Create `.env.example`**

Create `.env.example`:
```
# Backend
DATABASE_URL=postgresql://polls:polls@localhost:5432/survey_app
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
ADMIN_EMAIL=admin@polls.local
ADMIN_PASSWORD=admin
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

# Frontend
VITE_API_BASE_URL=/api/v1
```

- [ ] **Step 4: Create root `package.json` with workspaces**

Create `package.json`:
```json
{
  "name": "survey-app",
  "private": true,
  "version": "0.1.0",
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
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "openapi-typescript": "^7.4.0"
  }
}
```

- [ ] **Step 5: Create README skeleton**

Create `README.md`:
```markdown
# Survey App

Full-stack polling platform. Monorepo with NestJS + Prisma backend and React + Vite frontend, orchestrated with Docker Compose.

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Frontend: http://localhost:5173
Backend: http://localhost:3000/api/v1
Swagger: http://localhost:3000/api/docs

(Full quickstart added in Task 31.)
```

- [ ] **Step 6: Install root dev deps**

Run:
```bash
npm install
```
Expected: `node_modules/` and `package-lock.json` appear; no errors.

- [ ] **Step 7: Commit**

```bash
git add .nvmrc .gitignore .env.example package.json package-lock.json README.md
git commit -m "chore: scaffold repo with npm workspaces and dev defaults"
```

---

## Task 2: Backend NestJS scaffold (boots a hello-world)

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/jest.config.ts`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/src/app.controller.ts`
- Create: `backend/src/app.controller.spec.ts`

- [ ] **Step 1: Create backend workspace `package.json`**

```bash
mkdir -p backend/src
```

Create `backend/package.json`:
```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "check:ts": "tsc --noEmit",
    "lint": "eslint \"{src,test}/**/*.ts\" --max-warnings 0",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "spec:export": "ts-node -T src/spec-export.ts"
  },
  "prisma": { "seed": "ts-node -T prisma/seed.ts" },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "@prisma/client": "^5.20.0",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "cookie-parser": "^1.4.7",
    "nanoid": "^3.3.7",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.1.4",
    "@nestjs/testing": "^10.4.0",
    "@testcontainers/postgresql": "^10.13.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.13",
    "@types/node": "^20.16.10",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "jest-mock-extended": "^4.0.0-beta1",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "testcontainers": "^10.13.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.2"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {"^.+\\.(t|j)s$": "ts-jest"},
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json` and `backend/tsconfig.build.json`**

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

`backend/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "**/spec-export.ts"]
}
```

- [ ] **Step 3: Create `backend/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Create a hello-world controller + smoke test**

`backend/src/app.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

`backend/src/app.controller.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns ok status', async () => {
    const mod = await Test.createTestingModule({ controllers: [AppController] }).compile();
    const ctrl = mod.get(AppController);
    expect(ctrl.health()).toEqual({ status: 'ok' });
  });
});
```

`backend/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({ controllers: [AppController] })
export class AppModule {}
```

`backend/src/main.ts`:
```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
```

- [ ] **Step 5: Install backend deps and verify the test passes**

```bash
npm --workspace backend install
npm --workspace backend test -- --testPathPattern=app.controller
```
Expected: 1 test passes.

- [ ] **Step 6: Smoke-boot the backend**

```bash
npm --workspace backend run build
node backend/dist/main.js &
sleep 2
curl -sf http://localhost:3000/api/v1/health
kill %1 2>/dev/null || true
```
Expected: `{"status":"ok"}` printed; no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): nestjs scaffold with health endpoint"
```

---

## Task 3: Prisma init — schema (User + RefreshToken + Role) and initial migration

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_init/migration.sql` (generated)

- [ ] **Step 1: Create `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  passwordHash  String
  role          Role           @default(USER)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
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
```

- [ ] **Step 2: Ensure a Postgres is available**

This dev environment uses the developer's local Postgres (host 5432). A `polls` role and `survey_app` database have already been provisioned out-of-band. Verify:
```bash
PGPASSWORD=polls psql -h localhost -U polls -d survey_app -c 'SELECT 1' >/dev/null && echo "DB reachable"
```
Expected: `DB reachable`.

(If a fresh machine needed setup: as a Postgres superuser, run `CREATE ROLE polls WITH LOGIN PASSWORD 'polls';` and `CREATE DATABASE survey_app OWNER polls;`. Docker Compose's `db` service in Task 30 uses host port **5433** so it doesn't conflict with the local Postgres.)

- [ ] **Step 3: Generate the initial migration**

```bash
cd backend && DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  npx prisma migrate dev --name init && cd ..
```
Expected: `backend/prisma/migrations/<timestamp>_init/migration.sql` exists; `@prisma/client` is generated.

- [ ] **Step 4: Verify the schema in the DB**

```bash
PGPASSWORD=polls psql -h localhost -U polls -d survey_app -c '\dt'
```
Expected: `User`, `RefreshToken`, `_prisma_migrations` tables listed.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/
git commit -m "feat(backend): prisma schema for User and RefreshToken"
```

---

## Task 4: PrismaService module wired into AppModule

**Files:**
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create `prisma.service.ts`**

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Create `prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Add ConfigModule + PrismaModule to AppModule**

Replace `backend/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 4: Smoke test that Nest still boots**

```bash
npm --workspace backend run build && \
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  node backend/dist/main.js &
sleep 2
curl -sf http://localhost:3000/api/v1/health
kill %1 2>/dev/null || true
```
Expected: `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/prisma backend/src/app.module.ts
git commit -m "feat(backend): expose PrismaService via global module"
```

---

## Task 5: Prisma seed — first admin from env

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Create the seed script**

```ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = (process.env.ADMIN_EMAIL ?? 'admin@polls.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: admin ${email} already exists; skipping.`);
    await prisma.$disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name: 'Admin', passwordHash, role: Role.ADMIN },
  });
  console.log(`Seed: created admin ${email}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed against the dev DB**

```bash
cd backend && DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  ADMIN_EMAIL='admin@polls.local' ADMIN_PASSWORD='admin' \
  npx prisma db seed && cd ..
```
Expected: `Seed: created admin admin@polls.local.`

- [ ] **Step 3: Verify the admin exists**

```bash
PGPASSWORD=polls psql -h localhost -U polls -d survey_app \
  -c "SELECT email, role FROM \"User\";"
```
Expected: one row with `admin@polls.local | ADMIN`.

- [ ] **Step 4: Re-run seed; verify idempotency**

```bash
cd backend && DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  ADMIN_EMAIL='admin@polls.local' ADMIN_PASSWORD='admin' \
  npx prisma db seed && cd ..
```
Expected: `Seed: admin admin@polls.local already exists; skipping.`

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(backend): seed first admin from ADMIN_EMAIL/ADMIN_PASSWORD env"
```

---

## Task 6: Global setup in `main.ts` — CORS, cookie-parser, Swagger, validation pipe, exception filter

**Files:**
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Write the failing test for the exception filter**

Create `backend/src/common/filters/http-exception.filter.spec.ts`:
```ts
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  function makeHost(captured: any) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status(code: number) { captured.statusCode = code; return this; },
          json(body: any) { captured.body = body; return this; },
        }),
      }),
    } as unknown as ArgumentsHost;
  }

  it('emits the uniform error envelope for an HttpException with a code', () => {
    const captured: any = {};
    const filter = new HttpExceptionFilter();
    filter.catch(
      new HttpException({ code: 'POLL_CLOSED', message: 'closed' }, HttpStatus.FORBIDDEN),
      makeHost(captured),
    );
    expect(captured.statusCode).toBe(403);
    expect(captured.body).toMatchObject({
      statusCode: 403,
      code: 'POLL_CLOSED',
      message: 'closed',
    });
  });

  it('falls back to INTERNAL on a non-HttpException', () => {
    const captured: any = {};
    new HttpExceptionFilter().catch(new Error('boom'), makeHost(captured));
    expect(captured.statusCode).toBe(500);
    expect(captured.body.code).toBe('INTERNAL');
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
npm --workspace backend test -- --testPathPattern=http-exception
```
Expected: FAIL (file not found).

- [ ] **Step 3: Implement the filter**

`backend/src/common/filters/http-exception.filter.ts`:
```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let payload: ErrorPayload;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as { code?: string; message?: string | string[]; details?: unknown };
        payload = {
          statusCode: status,
          code: b.code ?? defaultCode(status),
          message: Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? exception.message),
          details: b.details,
        };
      } else {
        payload = { statusCode: status, code: defaultCode(status), message: String(body) };
      }
    } else {
      this.logger.error(exception);
      payload = { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL', message: 'Internal server error' };
    }
    res.status(payload.statusCode).json(payload);
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_FAILED';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    default: return 'INTERNAL';
  }
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
npm --workspace backend test -- --testPathPattern=http-exception
```
Expected: 2 tests pass.

- [ ] **Step 5: Wire up `main.ts` with all globals**

Replace `backend/src/main.ts`:
```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export async function buildApp() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Survey App API')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });

  return app;
}

async function bootstrap() {
  const app = await buildApp();
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
```

- [ ] **Step 6: Smoke test the boot, Swagger, and CORS preflight**

```bash
npm --workspace backend run build && \
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  FRONTEND_ORIGIN='http://localhost:5173' \
  node backend/dist/main.js &
sleep 2
curl -sf http://localhost:3000/api/v1/health
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/docs-json
curl -sf -o /dev/null -w "%{http_code}\n" -H "Origin: http://localhost:5173" \
  -X OPTIONS http://localhost:3000/api/v1/health
kill %1 2>/dev/null || true
```
Expected: `{"status":"ok"}`, then `200`, then `204` (CORS preflight OK).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main.ts backend/src/common/filters/
git commit -m "feat(backend): global validation pipe, exception filter, swagger, cors"
```

---

## Task 7: Auth DTOs — Register / Login / Me / Cookie payloads

**Files:**
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/dto/auth-response.dto.ts`

- [ ] **Step 1: RegisterDto**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: 'Alice Example' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
```

- [ ] **Step 2: LoginDto**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}
```

- [ ] **Step 3: Auth response DTOs**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['USER', 'ADMIN'] }) role!: 'USER' | 'ADMIN';
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/auth/dto/
git commit -m "feat(backend): auth DTOs with class-validator and swagger annotations"
```

---

## Task 8: Tokens service — sign / verify access + refresh, set/clear cookies

**Files:**
- Create: `backend/src/auth/tokens.service.ts`
- Create: `backend/src/auth/tokens.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';

describe('TokensService', () => {
  let svc: TokensService;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'a-secret';
    process.env.JWT_REFRESH_SECRET = 'r-secret';
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [TokensService],
    }).compile();
    svc = mod.get(TokensService);
  });

  it('signs and verifies an access token round-trip', async () => {
    const token = await svc.signAccessToken({ sub: 'u1', role: 'USER' });
    const decoded = await svc.verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('USER');
  });

  it('signs a refresh token with a jti and verifies it', async () => {
    const { token, jti } = await svc.signRefreshToken({ sub: 'u1' });
    expect(jti).toMatch(/^[a-z0-9_-]{8,}/i);
    const decoded = await svc.verifyRefreshToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.jti).toBe(jti);
  });

  it('hashes and compares a jti for storage', async () => {
    const h = await svc.hashJti('jti-1');
    expect(h).not.toBe('jti-1');
    expect(await svc.compareJti('jti-1', h)).toBe(true);
    expect(await svc.compareJti('jti-2', h)).toBe(false);
  });

  it('builds cookie options that match the security profile', () => {
    process.env.NODE_ENV = 'production';
    const opts = svc.cookieOptions('access');
    expect(opts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/v1', secure: true });
    process.env.NODE_ENV = 'development';
    expect(svc.cookieOptions('access').secure).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm --workspace backend test -- --testPathPattern=tokens.service
```
Expected: FAIL (file not found).

- [ ] **Step 3: Implement**

`backend/src/auth/tokens.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export interface AccessTokenPayload { sub: string; role: 'USER' | 'ADMIN' }
export interface RefreshTokenPayload { sub: string; jti: string }

@Injectable()
export class TokensService {
  constructor(private readonly jwt: JwtService) {}

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.requireEnv('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.requireEnv('JWT_ACCESS_SECRET'),
    });
  }

  async signRefreshToken(args: { sub: string }): Promise<{ token: string; jti: string }> {
    const jti = nanoid(24);
    const token = await this.jwt.signAsync({ sub: args.sub, jti }, {
      secret: this.requireEnv('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    return { token, jti };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.requireEnv('JWT_REFRESH_SECRET'),
    });
  }

  hashJti(jti: string): Promise<string> {
    return bcrypt.hash(jti, 10);
  }

  compareJti(jti: string, hash: string): Promise<boolean> {
    return bcrypt.compare(jti, hash);
  }

  cookieOptions(kind: 'access' | 'refresh'): {
    httpOnly: true; sameSite: 'lax'; path: string; secure: boolean; maxAge: number;
  } {
    const maxAge = kind === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/v1',
      secure: process.env.NODE_ENV === 'production',
      maxAge,
    };
  }

  refreshExpiresAt(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm --workspace backend test -- --testPathPattern=tokens.service
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/tokens.service.ts backend/src/auth/tokens.service.spec.ts
git commit -m "feat(backend): tokens service for jwt sign/verify and cookie options"
```

---

## Task 9: JWT strategies — access (header or cookie) and refresh (cookie only)

**Files:**
- Create: `backend/src/auth/strategies/jwt-access.strategy.ts`
- Create: `backend/src/auth/strategies/jwt-refresh.strategy.ts`

- [ ] **Step 1: Access strategy — reads `access_token` cookie**

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../tokens.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('Missing JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload) {
    return { id: payload.sub, role: payload.role };
  }
}
```

- [ ] **Step 2: Refresh strategy — reads `refresh_token` cookie and exposes raw token**

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { RefreshTokenPayload } from '../tokens.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('Missing JWT_REFRESH_SECRET');
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.refresh_token ?? null,
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload) {
    const rawToken: string = req.cookies?.refresh_token;
    return { id: payload.sub, jti: payload.jti, rawToken };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/strategies/
git commit -m "feat(backend): passport jwt strategies reading from httpOnly cookies"
```

---

## Task 10: Guards + decorators — JwtAccessGuard, JwtRefreshGuard, @CurrentUser, @Public

**Files:**
- Create: `backend/src/common/guards/jwt-access.guard.ts`
- Create: `backend/src/common/guards/jwt-refresh.guard.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/src/common/decorators/public.decorator.ts`

- [ ] **Step 1: JwtAccessGuard with `@Public` opt-out**

`backend/src/common/decorators/public.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

`backend/src/common/guards/jwt-access.guard.ts`:
```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 2: JwtRefreshGuard**

`backend/src/common/guards/jwt-refresh.guard.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
```

- [ ] **Step 3: @CurrentUser decorator**

`backend/src/common/decorators/current-user.decorator.ts`:
```ts
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  role: 'USER' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as CurrentUserPayload;
  },
);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/common/guards/ backend/src/common/decorators/
git commit -m "feat(backend): jwt guards and current-user / public decorators"
```

---

## Task 11: AuthService.register — unit-tested

**Files:**
- Create: `backend/src/auth/auth.service.ts` (stub now; fills in across T11–T14)
- Create: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`backend/src/auth/auth.service.spec.ts`:
```ts
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthService.register', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a-secret';
    process.env.JWT_REFRESH_SECRET = 'r-secret';
  });

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('creates a user with a bcrypt hash and issues a token pair', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
      passwordHash: 'h', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const result = await svc.register({ email: 'A@B.com', name: 'A', password: 'hunter22!' });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'a@b.com', role: Role.USER }),
    }));
    const hashed: string = (prisma.user.create.mock.calls[0][0] as any).data.passwordHash;
    expect(await bcrypt.compare('hunter22!', hashed)).toBe(true);

    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('throws EMAIL_TAKEN when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' } as any);
    await expect(svc.register({ email: 'a@b.com', name: 'A', password: 'hunter22!' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (no AuthService yet)**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement register**

`backend/src/auth/auth.service.ts`:
```ts
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';

export interface IssuedTokens { accessToken: string; refreshToken: string }
export interface AuthResult {
  user: { id: string; email: string; name: string; role: 'USER' | 'ADMIN' };
  tokens: IssuedTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async register(args: { email: string; name: string; password: string }): Promise<AuthResult> {
    const email = args.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(args.password, 10);
    const user = await this.prisma.user.create({
      data: { email, name: args.name, passwordHash, role: 'USER' },
    });
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  private async issueTokens(userId: string, role: 'USER' | 'ADMIN'): Promise<IssuedTokens> {
    const accessToken = await this.tokens.signAccessToken({ sub: userId, role });
    const { token: refreshToken, jti } = await this.tokens.signRefreshToken({ sub: userId });
    const jtiHash = await this.tokens.hashJti(jti);
    await this.prisma.refreshToken.create({
      data: { userId, jtiHash, expiresAt: this.tokens.refreshExpiresAt() },
    });
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "feat(backend): AuthService.register with bcrypt and token pair"
```

---

## Task 12: AuthService.login — unit-tested

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Append failing tests to the existing spec**

Add at the bottom of `auth.service.spec.ts`:
```ts
describe('AuthService.login', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('returns user + tokens on a valid password', async () => {
    const hash = await bcrypt.hash('hunter22!', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.login({ email: 'a@b.com', password: 'hunter22!' });
    expect(r.user.id).toBe('u1');
    expect(r.tokens.accessToken).toEqual(expect.any(String));
  });

  it('rejects on unknown email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.login({ email: 'x@y.z', password: 'x' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });

  it('rejects on wrong password', async () => {
    const hash = await bcrypt.hash('correct', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (no login method yet)**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: 3 new tests fail.

- [ ] **Step 3: Implement login**

Add to `auth.service.ts` inside the `AuthService` class:
```ts
import { UnauthorizedException } from '@nestjs/common';

// ...inside AuthService:
async login(args: { email: string; password: string }): Promise<AuthResult> {
  const email = args.email.trim().toLowerCase();
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid email or password' });
  }
  const ok = await bcrypt.compare(args.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid email or password' });
  }
  const tokens = await this.issueTokens(user.id, user.role);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tokens,
  };
}
```

(`UnauthorizedException` import should be added to the existing top import block — replace the existing common-import line with: `import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';`.)

- [ ] **Step 4: Run — expect PASS**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "feat(backend): AuthService.login with bcrypt verification"
```

---

## Task 13: AuthService.refresh (rotation) and AuthService.logout

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Append failing tests for refresh and logout**

Add to `auth.service.spec.ts`:
```ts
describe('AuthService.refresh (rotation)', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService, TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('rotates: deletes the old refresh row, issues a new pair', async () => {
    const hash = await bcrypt.hash('jti-1', 10);
    prisma.refreshToken.findMany.mockResolvedValueOnce([
      { id: 't1', userId: 'u1', jtiHash: hash, expiresAt: new Date(Date.now() + 10000), createdAt: new Date() } as any,
    ]);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: 'x',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.delete.mockResolvedValueOnce({} as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.refresh({ userId: 'u1', jti: 'jti-1' });
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(r.tokens.accessToken).toEqual(expect.any(String));
    expect(r.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejects when no matching jti row exists', async () => {
    prisma.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.refresh({ userId: 'u1', jti: 'nope' }))
      .rejects.toThrow(/REFRESH_INVALID/);
  });
});

describe('AuthService.logout', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [AuthService, TokensService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('deletes the matching refresh row by jti hash', async () => {
    const hash = await bcrypt.hash('jti-1', 10);
    prisma.refreshToken.findMany.mockResolvedValueOnce([
      { id: 't1', userId: 'u1', jtiHash: hash, expiresAt: new Date(Date.now() + 10000), createdAt: new Date() } as any,
    ]);
    prisma.refreshToken.delete.mockResolvedValueOnce({} as any);
    await svc.logout({ userId: 'u1', jti: 'jti-1' });
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('is a no-op when no matching row', async () => {
    prisma.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.logout({ userId: 'u1', jti: 'x' })).resolves.toBeUndefined();
    expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: 4 new tests fail.

- [ ] **Step 3: Implement `refresh` and `logout`**

Add to `auth.service.ts` inside `AuthService`:
```ts
async refresh(args: { userId: string; jti: string }): Promise<AuthResult> {
  const row = await this.findRefreshRow(args.userId, args.jti);
  if (!row) {
    throw new UnauthorizedException({ code: 'REFRESH_INVALID', message: 'Refresh token is not valid' });
  }
  await this.prisma.refreshToken.delete({ where: { id: row.id } });
  const user = await this.prisma.user.findUnique({ where: { id: args.userId } });
  if (!user) {
    throw new UnauthorizedException({ code: 'REFRESH_INVALID', message: 'Refresh token is not valid' });
  }
  const tokens = await this.issueTokens(user.id, user.role);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tokens,
  };
}

async logout(args: { userId: string; jti: string }): Promise<void> {
  const row = await this.findRefreshRow(args.userId, args.jti);
  if (row) await this.prisma.refreshToken.delete({ where: { id: row.id } });
}

private async findRefreshRow(userId: string, jti: string) {
  const rows = await this.prisma.refreshToken.findMany({ where: { userId } });
  for (const r of rows) {
    if (await this.tokens.compareJti(jti, r.jtiHash)) return r;
  }
  return null;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm --workspace backend test -- --testPathPattern=auth.service
```
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "feat(backend): AuthService refresh rotation and logout"
```

---

## Task 14: AuthModule + AuthController endpoints

**Files:**
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: AuthController with all 5 endpoints**

```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAccessGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('register')
  @Public()
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.auth.register(body);
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.auth.login(body);
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const payload = req.user as { id: string; jti: string };
    const result = await this.auth.refresh({ userId: payload.id, jti: payload.jti });
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('logout')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const payload = req.user as { id: string; jti: string };
    await this.auth.logout({ userId: payload.id, jti: payload.jti });
    this.clearCookies(res);
  }

  @Get('me')
  @ApiOkResponse({ type: AuthUserDto })
  async me(@CurrentUser() user: CurrentUserPayload): Promise<AuthUserDto> {
    const row = await this.auth.findUserById(user.id);
    return row;
  }

  private setCookies(res: Response, t: { accessToken: string; refreshToken: string }) {
    res.cookie('access_token', t.accessToken, this.tokens.cookieOptions('access'));
    res.cookie('refresh_token', t.refreshToken, this.tokens.cookieOptions('refresh'));
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/api/v1' });
    res.clearCookie('refresh_token', { path: '/api/v1' });
  }
}
```

- [ ] **Step 2: Add `findUserById` to AuthService**

In `auth.service.ts`, add inside `AuthService`:
```ts
async findUserById(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User no longer exists' });
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
```

- [ ] **Step 3: Create AuthModule wiring**

`backend/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    { provide: APP_GUARD, useClass: JwtAccessGuard },
  ],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
```

- [ ] **Step 4: Wire AuthModule into AppModule and mark health endpoint @Public**

Replace `backend/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Update `backend/src/app.controller.ts` so the health endpoint stays public now that the global guard is on:
```ts
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 5: Smoke boot and curl the endpoints**

```bash
npm --workspace backend run build && \
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' \
  node backend/dist/main.js &
sleep 2

# health is public
curl -sf http://localhost:3000/api/v1/health
# me without a cookie -> 401
curl -s -o /dev/null -w "me without cookie -> %{http_code}\n" http://localhost:3000/api/v1/auth/me
# register
curl -sf -c /tmp/cookies.txt -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","name":"Alice","password":"hunter22!"}'
# me with cookie -> 200
curl -sf -b /tmp/cookies.txt http://localhost:3000/api/v1/auth/me

kill %1 2>/dev/null || true
```
Expected: health prints `{"status":"ok"}`; me-without-cookie prints `401`; register prints user JSON; me-with-cookie prints the user.

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth/auth.controller.ts backend/src/auth/auth.module.ts \
  backend/src/auth/auth.service.ts backend/src/app.module.ts backend/src/app.controller.ts
git commit -m "feat(backend): auth controller for register/login/refresh/logout/me"
```

---

## Task 15: Auth e2e happy-path test (full Nest stack + supertest)

**Files:**
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/auth.e2e-spec.ts`

- [ ] **Step 1: Jest config for e2e**

`backend/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 2: Write the e2e test (Testcontainers Postgres)**

`backend/test/auth.e2e-spec.ts`:
```ts
import 'reflect-metadata';
import { execSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { buildApp } from '../src/main';
import type { INestApplication } from '@nestjs/common';

jest.setTimeout(120_000);

let pg: StartedPostgreSqlContainer;
let app: INestApplication;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.JWT_ACCESS_SECRET = 'a-secret';
  process.env.JWT_REFRESH_SECRET = 'r-secret';
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: pg.getConnectionUri() },
    stdio: 'inherit',
  });

  app = await buildApp();
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await pg?.stop();
});

describe('auth e2e', () => {
  const agent = () => request.agent(app.getHttpServer());

  it('register → me → logout → me-fails round trip', async () => {
    const a = agent();
    const reg = await a.post('/api/v1/auth/register').send({
      email: 'eve@example.com', name: 'Eve', password: 'hunter22!',
    }).expect(201);
    expect(reg.body.user.email).toBe('eve@example.com');

    const me = await a.get('/api/v1/auth/me').expect(200);
    expect(me.body.id).toEqual(expect.any(String));

    await a.post('/api/v1/auth/logout').expect(204);

    await a.get('/api/v1/auth/me').expect(401);
  });

  it('login → refresh rotates → reusing the old refresh cookie fails', async () => {
    // Register → capture the initial refresh cookie verbatim from Set-Cookie.
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'mallory@example.com', name: 'Mallory', password: 'hunter22!' })
      .expect(201);

    const setCookies = reg.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookies.find((c) => c.startsWith('refresh_token='));
    if (!refreshCookie) throw new Error('no refresh_token cookie set on register');

    // First use of that refresh cookie — rotates, returns 200.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    // Replaying the exact same cookie value — the underlying row was deleted; expect 401.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
    expect(replay.body.code).toBe('REFRESH_INVALID');
  });

  it('rejects duplicate registration with EMAIL_TAKEN', async () => {
    const a = agent();
    await a.post('/api/v1/auth/register').send({
      email: 'dup@example.com', name: 'D', password: 'hunter22!',
    }).expect(201);
    const dup = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'dup@example.com', name: 'D', password: 'hunter22!',
    }).expect(409);
    expect(dup.body.code).toBe('EMAIL_TAKEN');
  });
});
```

- [ ] **Step 3: Run the e2e suite**

```bash
npm --workspace backend run test:e2e
```
Expected: 3 tests pass. (First run pulls the Postgres image; subsequent runs are faster.)

- [ ] **Step 4: Commit**

```bash
git add backend/test/
git commit -m "test(backend): auth e2e covering register/me/logout/refresh rotation"
```

---

## Task 16: Spec export + OpenAPI codegen pipeline (commit `openapi.json` and `schema.ts`)

**Files:**
- Create: `backend/src/spec-export.ts`
- Create: `frontend/src/api/schema.ts` (generated)
- Create: `openapi.json` (generated, committed)

- [ ] **Step 1: Spec export script**

`backend/src/spec-export.ts`:
```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder()
    .setTitle('Survey App API')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  const out = resolve(__dirname, '../../openapi.json');
  writeFileSync(out, JSON.stringify(doc, null, 2));
  console.log(`Wrote ${out}`);
  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Make sure `frontend/src/api/` exists**

```bash
mkdir -p frontend/src/api
touch frontend/src/api/.gitkeep
```

- [ ] **Step 3: Generate the spec and types**

```bash
DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
JWT_ACCESS_SECRET='dev-access-secret' \
JWT_REFRESH_SECRET='dev-refresh-secret' \
npm run gen:api
```
Expected: `openapi.json` appears at the repo root; `frontend/src/api/schema.ts` is created with typed paths for `/auth/*`.

- [ ] **Step 4: Sanity-check the generated types**

```bash
grep -c "/auth/login" frontend/src/api/schema.ts
```
Expected: a non-zero number.

- [ ] **Step 5: Commit both generated artifacts**

```bash
git add backend/src/spec-export.ts openapi.json frontend/src/api/schema.ts frontend/src/api/.gitkeep
git commit -m "feat(api): export OpenAPI spec and generate frontend types"
```

---

## Task 17: Backend Dockerfile (multi-stage)

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Multi-stage Dockerfile**

```dockerfile
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Build it locally to verify**

```bash
docker build -t survey-app-backend:dev --target dev backend/
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore(backend): multi-stage dockerfile for dev/build/prod"
```

---

## Task 18: Frontend scaffold (Vite + React 19 + TS + Vitest)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Frontend `package.json`**

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check:ts": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --max-warnings 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "openapi-fetch": "^0.13.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^6.27.0",
    "sonner": "^1.5.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@testing-library/jest-dom": "^6.6.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-plugin-react": "^7.37.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "jsdom": "^25.0.1",
    "msw": "^2.4.9",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: TypeScript configs**

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Vite + Vitest configs (Vite proxy for /api)**

`frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

`frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 4: index.html and main.tsx (smoke-only for now)**

`frontend/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Polls</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div>Survey App — scaffold OK</div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

`frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Smoke test build + vitest**

```bash
npm --workspace frontend install
npm --workspace frontend run check:ts
npm --workspace frontend run build
```
Expected: build succeeds; `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json \
  frontend/vite.config.ts frontend/vitest.config.ts frontend/index.html \
  frontend/src/main.tsx frontend/src/test/setup.ts
git commit -m "chore(frontend): vite + react 19 + ts + vitest scaffold"
```

---

## Task 19: Tailwind + design-token CSS

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/tailwind.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Tailwind + PostCSS configs**

`frontend/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: 'var(--indigo-50)',
          100: 'var(--indigo-100)',
          600: 'var(--indigo-600)',
          700: 'var(--indigo-700)',
        },
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        red: { 50: 'var(--red-50)', 600: 'var(--red-600)' },
        green: { 50: 'var(--green-50)', 600: 'var(--green-600)' },
      },
    },
  },
  plugins: [],
};
export default config;
```

`frontend/postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Tokens — port from `design/styles.css`**

`frontend/src/styles/tokens.css`:
```css
:root {
  /* Indigo */
  --indigo-50:  #eef2ff;
  --indigo-100: #e0e7ff;
  --indigo-600: #4f46e5;
  --indigo-700: #4338ca;

  /* Gray */
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Semantic */
  --red-50:   #fef2f2;
  --red-600:  #dc2626;
  --green-50: #ecfdf5;
  --green-600:#059669;
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--gray-50);
  color: var(--gray-900);
}
```

> Cross-reference: if `design/styles.css` defines more or different shades, copy them verbatim. The values above match the design kit's defaults.

- [ ] **Step 3: Tailwind entry CSS**

`frontend/src/styles/tailwind.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Import both into `main.tsx`**

Replace `frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/tailwind.css';

function App() {
  return <div className="p-8 text-2xl font-bold text-indigo-600">Survey App — scaffold OK</div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 5: Verify build still works**

```bash
npm --workspace frontend run build
```
Expected: build succeeds; CSS is bundled.

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.js frontend/src/styles/ frontend/src/main.tsx
git commit -m "feat(frontend): tailwind + design tokens"
```

---

## Task 20: Frontend primitives — Button, Input, Field, Spinner, Card, Avatar, Badge

**Files:**
- Create: `frontend/src/components/primitives/Button.tsx`
- Create: `frontend/src/components/primitives/Input.tsx`
- Create: `frontend/src/components/primitives/Field.tsx`
- Create: `frontend/src/components/primitives/Spinner.tsx`
- Create: `frontend/src/components/primitives/Card.tsx`
- Create: `frontend/src/components/primitives/Avatar.tsx`
- Create: `frontend/src/components/primitives/Badge.tsx`
- Create: `frontend/src/components/primitives/__tests__/Button.test.tsx`

- [ ] **Step 1: Button**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-600/60',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-600/90',
};
const SIZE_CLS: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', isLoading, disabled, className = '', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
      {...rest}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
});
```

- [ ] **Step 2: Input + Field**

`Input.tsx`:
```tsx
import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`}
        {...rest}
      />
    );
  },
);
```

`Field.tsx`:
```tsx
import { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
```

- [ ] **Step 3: Spinner, Card, Avatar, Badge**

`Spinner.tsx`:
```tsx
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
```

`Card.tsx`:
```tsx
import { HTMLAttributes } from 'react';

type Size = 'sm' | 'md' | 'lg';
const PAD: Record<Size, string> = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export function Card({ size = 'md', className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { size?: Size }) {
  return (
    <div className={`rounded-lg bg-white border border-gray-200 shadow-sm ${PAD[size]} ${className}`} {...rest} />
  );
}
```

`Avatar.tsx`:
```tsx
type Size = 'sm' | 'md' | 'lg';
const SIZES: Record<Size, string> = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ name, size = 'md', variant = 'light' }: { name?: string; size?: Size; variant?: 'light' | 'dark' }) {
  const initials = (name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const palette = variant === 'dark' ? 'bg-gray-700 text-white' : 'bg-indigo-100 text-indigo-700';
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold ${SIZES[size]} ${palette}`}>
      {initials}
    </span>
  );
}
```

`Badge.tsx`:
```tsx
type Variant = 'default' | 'success' | 'info' | 'danger';
const CLS: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-600',
  info: 'bg-indigo-50 text-indigo-700',
  danger: 'bg-red-50 text-red-600',
};

export function Badge({ variant = 'default', children }: { variant?: Variant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CLS[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Smoke test for Button**

`frontend/src/components/primitives/__tests__/Button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

it('renders children and fires onClick', async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('disables interaction while loading', async () => {
  const onClick = vi.fn();
  render(<Button isLoading onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Run the test**

```bash
npm --workspace frontend test
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/primitives/
git commit -m "feat(frontend): primitives — Button/Input/Field/Spinner/Card/Avatar/Badge"
```

---

## Task 21: openapi-fetch client + 401 refresh middleware

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/refresh-middleware.ts`
- Create: `frontend/src/api/__tests__/refresh-middleware.test.ts`

- [ ] **Step 1: Write the failing test for the middleware**

`frontend/src/api/__tests__/refresh-middleware.test.ts`:
```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import createClient, { Middleware } from 'openapi-fetch';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createRefreshMiddleware } from '../refresh-middleware';

interface FakePaths {
  '/protected': { get: { responses: { 200: { content: { 'application/json': { ok: true } } }; 401: { content: { 'application/json': { code: 'UNAUTHENTICATED' } } } } } };
  '/auth/refresh': { post: { responses: { 200: { content: { 'application/json': { ok: true } } }; 401: { content: { 'application/json': { code: 'REFRESH_INVALID' } } } } } };
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(onForceLogout: () => void) {
  const client = createClient<FakePaths>({ baseUrl: 'http://api.test' });
  client.use(createRefreshMiddleware(client, { onForceLogout }) as Middleware);
  return client;
}

describe('refresh middleware', () => {
  it('on 401, calls /auth/refresh once and retries the original request', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    server.use(
      http.get('http://api.test/protected', () => {
        protectedCalls++;
        if (protectedCalls === 1) return new HttpResponse(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 });
        return HttpResponse.json({ ok: true });
      }),
      http.post('http://api.test/auth/refresh', () => {
        refreshCalls++;
        return HttpResponse.json({ ok: true });
      }),
    );

    const c = makeClient(() => {});
    const r = await c.GET('/protected');
    expect(r.response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });

  it('on refresh failure, calls onForceLogout and surfaces the original 401', async () => {
    const onForceLogout = vi.fn();
    server.use(
      http.get('http://api.test/protected', () => new HttpResponse(null, { status: 401 })),
      http.post('http://api.test/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );

    const c = makeClient(onForceLogout);
    const r = await c.GET('/protected');
    expect(r.response.status).toBe(401);
    expect(onForceLogout).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm --workspace frontend test -- refresh-middleware
```
Expected: FAIL (file not found).

- [ ] **Step 3: Implement the middleware**

`frontend/src/api/refresh-middleware.ts`:
```ts
import type { Middleware, Client } from 'openapi-fetch';

interface Options {
  onForceLogout: () => void;
}

export function createRefreshMiddleware(client: Client<any>, opts: Options): Middleware {
  let refreshInFlight: Promise<boolean> | null = null;

  function tryRefresh(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const r = await client.POST('/auth/refresh' as any);
        return r.response.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  return {
    async onResponse({ request, response }) {
      if (response.status !== 401) return response;
      if (request.url.endsWith('/auth/refresh') || request.url.endsWith('/auth/login') || request.url.endsWith('/auth/register')) {
        return response;
      }
      const ok = await tryRefresh();
      if (!ok) {
        opts.onForceLogout();
        return response;
      }
      return fetch(request);
    },
  };
}
```

- [ ] **Step 4: Implement the shared client**

`frontend/src/api/client.ts`:
```ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { createRefreshMiddleware } from './refresh-middleware';

export type ApiPaths = paths;

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = createClient<ApiPaths>({
  baseUrl,
  credentials: 'include',
});

let forceLogoutHandler: () => void = () => {};
export function setForceLogoutHandler(fn: () => void) {
  forceLogoutHandler = fn;
}

apiClient.use(createRefreshMiddleware(apiClient, {
  onForceLogout: () => forceLogoutHandler(),
}));
```

- [ ] **Step 5: Run — expect PASS**

```bash
npm --workspace frontend test -- refresh-middleware
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/refresh-middleware.ts \
  frontend/src/api/__tests__/
git commit -m "feat(frontend): openapi-fetch client with 401-refresh-retry middleware"
```

---

## Task 22: AuthProvider + useAuth + login/register/logout mutations

**Files:**
- Create: `frontend/src/auth/AuthProvider.tsx`
- Create: `frontend/src/auth/useAuth.ts`
- Create: `frontend/src/auth/auth-mutations.ts`
- Create: `frontend/src/test/msw-handlers.ts`

- [ ] **Step 1: msw handlers for tests + dev mocking**

`frontend/src/test/msw-handlers.ts`:
```ts
import { http, HttpResponse } from 'msw';

export const defaultHandlers = [
  http.get('http://localhost/api/v1/auth/me', () =>
    HttpResponse.json({ id: 'u1', email: 'me@example.com', name: 'Me', role: 'USER' }),
  ),
];
```

- [ ] **Step 2: AuthProvider + useAuth**

`frontend/src/auth/AuthProvider.tsx`:
```tsx
import { createContext, ReactNode, useContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { apiClient, setForceLogoutHandler } from '../api/client';

export interface AuthUser { id: string; email: string; name: string; role: 'USER' | 'ADMIN' }
type AuthState = { user: AuthUser | null; isLoading: boolean };

const AuthContext = createContext<AuthState | null>(null);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </QueryClientProvider>
  );
}

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const r = await apiClient.GET('/auth/me' as any);
      if (!r.response.ok) return null;
      return (r.data as AuthUser) ?? null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    setForceLogoutHandler(() => {
      queryClient.setQueryData(['auth', 'me'], null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user: meQuery.data ?? null, isLoading: meQuery.isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function setMeInCache(user: AuthUser | null) {
  queryClient.setQueryData(['auth', 'me'], user);
}

export { queryClient };
```

`frontend/src/auth/useAuth.ts`:
```ts
import { useAuthContext } from './AuthProvider';
export const useAuth = useAuthContext;
```

- [ ] **Step 3: Login / register / logout mutations**

`frontend/src/auth/auth-mutations.ts`:
```ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { setMeInCache, type AuthUser } from './AuthProvider';

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const r = await apiClient.POST('/auth/login' as any, { body: input } as any);
      if (!r.response.ok) throw r.error ?? new Error('Login failed');
      return (r.data as { user: AuthUser }).user;
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (input: { email: string; name: string; password: string }) => {
      const r = await apiClient.POST('/auth/register' as any, { body: input } as any);
      if (!r.response.ok) throw r.error ?? new Error('Register failed');
      return (r.data as { user: AuthUser }).user;
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.POST('/auth/logout' as any);
    },
    onSuccess: () => setMeInCache(null),
  });
}
```

- [ ] **Step 4: Type-check**

```bash
npm --workspace frontend run check:ts
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/ frontend/src/test/msw-handlers.ts
git commit -m "feat(frontend): AuthProvider, useAuth, login/register/logout mutations"
```

---

## Task 23: RequireAuth and RequireAdmin route guards

**Files:**
- Create: `frontend/src/auth/RequireAuth.tsx`
- Create: `frontend/src/auth/RequireAdmin.tsx`
- Create: `frontend/src/auth/__tests__/RequireAuth.test.tsx`

- [ ] **Step 1: RequireAuth**

```tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Spinner } from '../components/primitives/Spinner';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="flex justify-center p-12"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
```

- [ ] **Step 2: RequireAdmin**

```tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Spinner } from '../components/primitives/Spinner';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center p-12"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Test (mocks the auth context)**

`frontend/src/auth/__tests__/RequireAuth.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';

vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

it('redirects unauthenticated users to /login', () => {
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/secret" element={<RequireAuth><div>Secret</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Login')).toBeInTheDocument();
});
```

- [ ] **Step 4: Run**

```bash
npm --workspace frontend test -- RequireAuth
```
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/RequireAuth.tsx frontend/src/auth/RequireAdmin.tsx \
  frontend/src/auth/__tests__/
git commit -m "feat(frontend): RequireAuth and RequireAdmin guards"
```

---

## Task 24: Router + App + MainLayout

**Files:**
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/layouts/MainLayout/MainLayout.tsx`
- Create: `frontend/src/layouts/MainLayout/Header.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: MainLayout + Header**

`frontend/src/layouts/MainLayout/Header.tsx`:
```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useLogoutMutation } from '../../auth/auth-mutations';
import { Button } from '../../components/primitives/Button';
import { Avatar } from '../../components/primitives/Avatar';

export function Header() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight">Polls</Link>
      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <Link to="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
            <Avatar name={user.name} size="sm" />
            <span className="text-sm text-gray-700">{user.name}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button variant="secondary" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Sign up</Button></Link>
          </>
        )}
      </nav>
    </header>
  );
}
```

`frontend/src/layouts/MainLayout/MainLayout.tsx`:
```tsx
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 2: Router**

`frontend/src/router.tsx`:
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { DashboardScreen } from './routes/dashboard/DashboardScreen';
import { RequireAuth } from './auth/RequireAuth';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <LandingScreen /> },
      { path: '/login', element: <LoginScreen /> },
      { path: '/register', element: <RegisterScreen /> },
      { path: '/dashboard', element: <RequireAuth><DashboardScreen /></RequireAuth> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```

- [ ] **Step 3: App**

`frontend/src/App.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthProvider';
import { router } from './router';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Update main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/tailwind.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 5: Commit** (screens come in T25–T28 — type-check will fail until then)

```bash
git add frontend/src/router.tsx frontend/src/App.tsx \
  frontend/src/layouts/MainLayout/ frontend/src/main.tsx
git commit -m "feat(frontend): router, App, MainLayout (screens wired in T25-T28)"
```

---

## Task 25: LandingScreen

**Files:**
- Create: `frontend/src/routes/landing/LandingScreen.tsx`

- [ ] **Step 1: Port `LandingScreen` from `design/AuthScreens.jsx`**

Reference: `design/AuthScreens.jsx`'s `LandingScreen`. Port to TSX with Tailwind classes (no inline styles), using `Button` from primitives.

```tsx
import { Link } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';

export function LandingScreen() {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Polls that get answers.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Build single-choice, multiple-choice, and open-ended polls. Share a link, watch responses arrive in real time.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register"><Button size="lg">Get started</Button></Link>
          <Link to="/login"><Button size="lg" variant="secondary">I have an account</Button></Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/landing/
git commit -m "feat(frontend): landing screen"
```

---

## Task 26: LoginScreen + AuthCard

**Files:**
- Create: `frontend/src/routes/auth/AuthCard.tsx`
- Create: `frontend/src/routes/auth/LoginScreen.tsx`
- Create: `frontend/src/forms/schemas/login.schema.ts`

- [ ] **Step 1: Zod schema for the login form**

`frontend/src/forms/schemas/login.schema.ts`:
```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: AuthCard (shared frame for login + register)**

```tsx
import { ReactNode } from 'react';
import { Card } from '../../components/primitives/Card';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex justify-center py-16 px-6">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: LoginScreen**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Field } from '../../components/primitives/Field';
import { useLoginMutation } from '../../auth/auth-mutations';
import { loginSchema, LoginFormValues } from '../../forms/schemas/login.schema';

export function LoginScreen() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const login = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch {
      toast.error('Invalid email or password');
    }
  });

  return (
    <AuthCard title="Sign in" subtitle="Enter your email and password.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input id="login-email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="login-pw" error={errors.password?.message}>
          <Input id="login-pw" type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" isLoading={login.isPending}>Sign in</Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        New here? <Link to="/register" className="text-indigo-600 hover:underline">Create an account</Link>
      </p>
    </AuthCard>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/auth/AuthCard.tsx frontend/src/routes/auth/LoginScreen.tsx \
  frontend/src/forms/schemas/login.schema.ts
git commit -m "feat(frontend): login screen with form validation"
```

---

## Task 27: RegisterScreen

**Files:**
- Create: `frontend/src/routes/auth/RegisterScreen.tsx`
- Create: `frontend/src/forms/schemas/register.schema.ts`

- [ ] **Step 1: Zod schema**

```ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name is too long'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
```

- [ ] **Step 2: RegisterScreen**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Field } from '../../components/primitives/Field';
import { useRegisterMutation } from '../../auth/auth-mutations';
import { registerSchema, RegisterFormValues } from '../../forms/schemas/register.schema';

export function RegisterScreen() {
  const { register: registerInput, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });
  const reg = useRegisterMutation();
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reg.mutateAsync(values);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'EMAIL_TAKEN') toast.error('That email is already registered.');
      else toast.error('Could not create your account.');
    }
  });

  return (
    <AuthCard title="Create an account" subtitle="Get started in 30 seconds.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="reg-name" error={errors.name?.message}>
          <Input id="reg-name" autoComplete="name" {...registerInput('name')} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
          <Input id="reg-email" type="email" autoComplete="email" {...registerInput('email')} />
        </Field>
        <Field label="Password" htmlFor="reg-pw" error={errors.password?.message}>
          <Input id="reg-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...registerInput('password')} />
        </Field>
        <Button type="submit" isLoading={reg.isPending}>Create account</Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/auth/RegisterScreen.tsx frontend/src/forms/schemas/register.schema.ts
git commit -m "feat(frontend): register screen with form validation"
```

---

## Task 28: Empty DashboardScreen placeholder + final type-check

**Files:**
- Create: `frontend/src/routes/dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Empty placeholder**

```tsx
import { Card } from '../../components/primitives/Card';
import { useAuth } from '../../auth/useAuth';

export function DashboardScreen() {
  const { user } = useAuth();
  return (
    <section className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Welcome back, {user?.name}.</p>
      <Card className="mt-8 text-center">
        <p className="text-3xl">📋</p>
        <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Poll creation lands in Plan 2 — for now you've successfully signed in.
        </p>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Full type-check**

```bash
npm --workspace frontend run check:ts
```
Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm --workspace frontend run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/dashboard/DashboardScreen.tsx
git commit -m "feat(frontend): empty dashboard placeholder + clean ts build"
```

---

## Task 29: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Multi-stage Dockerfile**

```dockerfile
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true
EXPOSE 80
```

- [ ] **Step 2: Build it locally**

```bash
docker build -t survey-app-frontend:dev --target dev frontend/
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile
git commit -m "chore(frontend): multi-stage dockerfile for dev/build/prod"
```

---

## Task 30: docker-compose.yml — db + backend + frontend

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Compose file**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: survey_app
      POSTGRES_USER: polls
      POSTGRES_PASSWORD: polls
    volumes:
      - db-data:/var/lib/postgresql/data
    ports:
      - "5433:5432"          # host 5433 → container 5432 (host 5432 is the developer's local Postgres)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U polls -d survey_app"]
      interval: 3s
      timeout: 3s
      retries: 20

  backend:
    build:
      context: ./backend
      target: dev
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && npm run start:dev"
    environment:
      DATABASE_URL: postgresql://polls:polls@db:5432/survey_app
      JWT_ACCESS_SECRET: dev-access-secret-change-me
      JWT_REFRESH_SECRET: dev-refresh-secret-change-me
      ADMIN_EMAIL: admin@polls.local
      ADMIN_PASSWORD: admin
      NODE_ENV: development
      PORT: "3000"
      FRONTEND_ORIGIN: http://localhost:5173
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      target: dev
    command: npm run dev -- --host 0.0.0.0
    environment:
      VITE_API_BASE_URL: /api/v1
      VITE_BACKEND_PROXY: http://backend:3000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  db-data:
```

- [ ] **Step 2: Stop the standalone Postgres (Task 3) and bring the stack up**

```bash
docker stop polls-pg-dev && docker rm polls-pg-dev || true
docker compose up -d --build
sleep 15
docker compose ps
```
Expected: all three services healthy (or "running" for backend/frontend).

- [ ] **Step 3: Smoke check the stack**

```bash
curl -sf http://localhost:3000/api/v1/health
curl -sf -o /dev/null -w "frontend -> %{http_code}\n" http://localhost:5173
curl -sf -c /tmp/cookies.txt -X POST http://localhost:5173/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@polls.local","password":"admin"}'
curl -sf -b /tmp/cookies.txt http://localhost:5173/api/v1/auth/me
```
Expected: health is ok; frontend returns `200`; admin login succeeds; `me` returns the admin user.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: docker compose for db + backend + frontend"
```

---

## Task 31: README quickstart + open-browser smoke check

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Expand README**

Replace `README.md`:
```markdown
# Survey App

Full-stack polling platform. Monorepo with NestJS + Prisma backend and React + Vite frontend, orchestrated with Docker Compose.

Spec: [`docs/superpowers/specs/2026-05-26-survey-app-design.md`](docs/superpowers/specs/2026-05-26-survey-app-design.md)
Plan 1 (this one): [`docs/superpowers/plans/2026-05-26-foundation-and-auth.md`](docs/superpowers/plans/2026-05-26-foundation-and-auth.md)

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs

A seed admin is created on first boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@polls.local` / `admin`).

## Local-without-Docker

Requires Node 20 (see `.nvmrc`) and Postgres on `localhost:5432`.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev          # runs backend (:3000) + frontend (:5173)
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

Both are committed so PRs visibly carry contract changes. CI fails if either drifts from `npm run gen:api`.
```

- [ ] **Step 2: Final end-to-end smoke**

```bash
docker compose down -v
docker compose up -d --build
sleep 20

# Open in a browser and run through the loop manually:
#   http://localhost:5173/register  → create a user → land on /dashboard
#   click Sign out                  → land on /
#   http://localhost:5173/login     → log in as admin@polls.local / admin
#   visit /dashboard                → see the admin's empty dashboard
```

Verify via curl that the full chain works:
```bash
COOKIES=/tmp/cookies.txt
rm -f "$COOKIES"

curl -sf -c "$COOKIES" -X POST http://localhost:5173/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","name":"Smoke","password":"hunter22!"}'

curl -sf -b "$COOKIES" -c "$COOKIES" http://localhost:5173/api/v1/auth/me

curl -sf -b "$COOKIES" -c "$COOKIES" -X POST http://localhost:5173/api/v1/auth/refresh

curl -sf -b "$COOKIES" -c "$COOKIES" -X POST http://localhost:5173/api/v1/auth/logout -o /dev/null -w "logout -> %{http_code}\n"

curl -s -b "$COOKIES" -o /dev/null -w "me after logout -> %{http_code}\n" http://localhost:5173/api/v1/auth/me
```
Expected: register prints the user JSON; me returns that user; refresh prints the user JSON; logout prints `logout -> 204`; me-after-logout prints `me after logout -> 401`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: quickstart and dev workflow"
```

---

## Definition of done (Plan 1)

- [ ] `docker compose up --build` brings up db / backend / frontend cleanly.
- [ ] `http://localhost:5173/` lands on the LandingScreen.
- [ ] `/register` creates a user, sets cookies, redirects to `/dashboard`.
- [ ] `/login` works for the seeded admin and any registered user.
- [ ] `Sign out` clears cookies and the next `/auth/me` returns `401`.
- [ ] After the access token expires (or is removed), the refresh middleware silently obtains a new pair on the next request.
- [ ] `npm test` (both workspaces) and `npm run check:ts` pass with no warnings.
- [ ] `npm run gen:api` regenerates `openapi.json` and `frontend/src/api/schema.ts` with no diff against what's committed.

Plan 2 (Polls + Public Responses) starts from this clean foundation.
