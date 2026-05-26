# Polls + Public Responses Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the polling product on top of Plan 1's foundation. Owners can create polls (single-choice / multi-choice / text questions), edit metadata always and structure until the first response lands, toggle active and copy share-links from a redesigned dashboard. Anonymous respondents visit `/p/:slug`, get a per-poll cookie, submit once; the public view goes read-only when the poll is closed or expired. End state: full create → share → answer → see-it-counted loop works end-to-end, all through the live `docker compose` stack.

**Architecture:** Two new backend modules (`polls`, `responses`) added to NestJS; one Prisma migration adding `Poll`, `Question`, `Option`, `Response`, `Answer`, `AnswerOption` and the `QuestionType` + `Visibility` enums. Edit-lock enforced in `PollsService` (anything structural blocked once `responseCount > 0`). Anonymous submission gated by an `HttpOnly` per-poll cookie (`respondent_<pollId>`), with a unique constraint on `(pollId, respondentCookie)` enforcing dedup. Frontend gains polls + responses TanStack Query hooks, three new primitives (`Textarea`, `Select`, `ConfirmDialog`), a rebuilt dashboard with `PollListItem` rows, a create/edit poll form (with a locked-state banner once responses exist), and the public `/p/:slug` poll-taking screen.

**Spec reference:** `docs/superpowers/specs/2026-05-26-survey-app-design.md` — Sections 1, 4 (data model), 5 (API surface), 7 (frontend), 8 (anonymous responses), 11 (defaulted decisions). Plan 1's foundation lives in `docs/superpowers/plans/2026-05-26-foundation-and-auth.md`.

**Tech stack additions over Plan 1:** none new at the dep level — all libraries (`@nestjs/swagger`, `class-validator`, `nanoid`, `react-hook-form`, `zod`, `@tanstack/react-query`) are already installed.

---

## File Structure

```
backend/src/
├── polls/
│   ├── polls.module.ts                          # T09
│   ├── polls.controller.ts                      # T09
│   ├── polls.service.ts                         # T05, T06, T07, T08
│   ├── polls.service.spec.ts                    # T05, T06, T07, T08
│   ├── slug.service.ts                          # T03 — nanoid wrapper, owner-of-collision-retry
│   ├── slug.service.spec.ts                     # T03
│   └── dto/
│       ├── option.dto.ts                        # T04
│       ├── question.dto.ts                      # T04
│       ├── create-poll.dto.ts                   # T04
│       ├── update-poll.dto.ts                   # T04
│       ├── toggle-active.dto.ts                 # T04
│       └── poll-response.dto.ts                 # T04
├── responses/
│   ├── responses.module.ts                      # T12
│   ├── responses.controller.ts                  # T12
│   ├── responses.service.ts                     # T10, T11
│   ├── responses.service.spec.ts                # T10, T11
│   └── dto/
│       ├── public-poll.dto.ts                   # T10
│       └── submit-response.dto.ts               # T11
├── app.module.ts                                # MODIFY in T09 + T12
├── spec-export.ts                               # MODIFY in T01 — drop /api/v1 prefix
└── (Plan 1 files untouched unless noted)

backend/prisma/
├── schema.prisma                                # MODIFY in T02 — add Poll/Question/Option/Response/Answer/AnswerOption/QuestionType/Visibility
└── migrations/<ts>_polls_and_responses/         # GENERATED in T02

backend/test/
├── polls.e2e-spec.ts                            # T13
└── responses.e2e-spec.ts                        # T13

openapi.json                                     # REGENERATED in T14
frontend/src/api/schema.ts                       # REGENERATED in T14

frontend/src/
├── api/
│   ├── client.ts                                # MODIFY in T01 — drop `as any` casts
│   ├── queries/
│   │   ├── polls.ts                             # T16
│   │   └── public-polls.ts                      # T22
│   └── mutations/
│       ├── polls.ts                             # T16
│       └── responses.ts                         # T22
├── auth/
│   ├── AuthProvider.tsx                         # MODIFY in T01 — drop `as any` from auth/me
│   └── auth-mutations.ts                        # MODIFY in T01 — drop `as any` from login/register/logout
├── api/refresh-middleware.ts                    # MODIFY in T01 — drop `as any` from /auth/refresh
├── components/primitives/
│   ├── Textarea.tsx                             # T15
│   ├── Select.tsx                               # T15
│   └── ConfirmDialog.tsx                        # T15
├── forms/schemas/
│   └── poll.schema.ts                           # T18
├── routes/
│   ├── dashboard/
│   │   ├── DashboardScreen.tsx                  # MODIFY in T17 — replace empty placeholder
│   │   └── PollListItem.tsx                     # T17
│   ├── polls/
│   │   ├── PollFormScreen.tsx                   # T19, T20
│   │   ├── QuestionEditor.tsx                   # T19
│   │   └── OptionEditor.tsx                     # T19
│   └── poll/
│       ├── QuestionRenderer.tsx                 # T21
│       └── PollScreen.tsx                       # T22
├── lib/
│   ├── format-date.ts                           # T17 — for "Expires …" line
│   └── copy-to-clipboard.ts                     # T17 — "Copy link" button helper
└── router.tsx                                   # MODIFY in T19 + T22 — add /polls/new, /polls/:id/edit, /p/:slug
```

---

## Conventions

- Every step ends with a commit. Conventional commits (`feat:`, `fix:`, `test:`, `refactor:`).
- Run commands from the repo root unless noted (cd shown).
- TDD where the task says "TDD" — write the failing test, run it red, write the implementation, run it green, commit.
- For frontend tests, `vi` and `vitest` globals are available (`types: ["vitest/globals", ...]` in `tsconfig`).
- Backend e2e tests are in `backend/test/*.e2e-spec.ts` and run via `npm --workspace backend run test:e2e`. They use Testcontainers Postgres and inherit colima env vars from the existing script.

---

## Task 1: Strip `/api/v1` prefix from OpenAPI spec → typed client calls without `as any`

**Why now:** Plan 1's frontend client uses `as any` everywhere because the generated `paths` interface keys are `/api/v1/auth/login` while client calls pass `/auth/login` (since `baseUrl` already prepends `/api/v1`). Plan 2 adds many more API calls — fix once, not many times.

**Files:**
- Modify: `backend/src/spec-export.ts`
- Modify: `frontend/src/api/refresh-middleware.ts`
- Modify: `frontend/src/auth/AuthProvider.tsx`
- Modify: `frontend/src/auth/auth-mutations.ts`
- Regenerate: `openapi.json`, `frontend/src/api/schema.ts`

- [ ] **Step 1: Modify `backend/src/spec-export.ts` — remove the global prefix**

  Find this block:
  ```ts
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  ```
  Change to:
  ```ts
  const app = await NestFactory.create(AppModule, { logger: false });
  // Intentionally NOT calling setGlobalPrefix — the frontend client adds /api/v1 via baseUrl,
  // so paths in openapi.json should be unprefixed (`/auth/login`, not `/api/v1/auth/login`).
  ```

- [ ] **Step 2: Regenerate spec + types**
  ```bash
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' \
  JWT_REFRESH_SECRET='dev-refresh-secret' \
  npm run gen:api
  ```
  Verify:
  ```bash
  grep -c '"/auth/login"' openapi.json
  grep -c '"/api/v1/auth/login"' openapi.json
  ```
  Expected: first grep ≥ 1, second grep = 0.

- [ ] **Step 3: Strip `as any` casts in the existing frontend auth code**

  In `frontend/src/api/refresh-middleware.ts`, replace:
  ```ts
  const r = await client.POST('/auth/refresh' as any);
  ```
  with:
  ```ts
  const r = await client.POST('/auth/refresh' as never);
  ```
  (The middleware still uses `Client<any>`, so the path type can't be narrowed without breaking generality — `as never` is more honest than `as any`.)

  In `frontend/src/auth/AuthProvider.tsx`, replace:
  ```ts
  const r = await apiClient.GET('/auth/me' as any);
  ```
  with:
  ```ts
  const r = await apiClient.GET('/auth/me');
  ```

  In `frontend/src/auth/auth-mutations.ts`, replace each of:
  ```ts
  const r = await apiClient.POST('/auth/login' as any, { body: input } as any);
  const r = await apiClient.POST('/auth/register' as any, { body: input } as any);
  await apiClient.POST('/auth/logout' as any);
  ```
  with the typed forms:
  ```ts
  const r = await apiClient.POST('/auth/login', { body: input });
  const r = await apiClient.POST('/auth/register', { body: input });
  await apiClient.POST('/auth/logout');
  ```

- [ ] **Step 4: Confirm both type-checks still pass**
  ```bash
  npm run check:ts
  ```
  Expected: clean on both workspaces.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/spec-export.ts openapi.json frontend/src/api/schema.ts \
    frontend/src/api/refresh-middleware.ts frontend/src/auth/AuthProvider.tsx \
    frontend/src/auth/auth-mutations.ts
  git commit -m "refactor(api): drop /api/v1 prefix from openapi schema; remove as any casts"
  ```

---

## Task 2: Prisma migration — Poll, Question, Option, Response, Answer, AnswerOption + enums

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Generated: `backend/prisma/migrations/<timestamp>_polls_and_responses/migration.sql`

- [ ] **Step 1: Append to `backend/prisma/schema.prisma`**

  Add these enums + models at the bottom:
  ```prisma
  enum QuestionType {
    SINGLE_CHOICE
    MULTIPLE_CHOICE
    TEXT
  }

  enum Visibility {
    PUBLIC
    PRIVATE
  }

  model Poll {
    id          String     @id @default(cuid())
    slug        String     @unique
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
    id               String   @id @default(cuid())
    pollId           String
    poll             Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
    respondentCookie String
    createdAt        DateTime @default(now())
    answers          Answer[]

    @@unique([pollId, respondentCookie])
    @@index([pollId, createdAt])
  }

  model Answer {
    id              String         @id @default(cuid())
    responseId      String
    response        Response       @relation(fields: [responseId], references: [id], onDelete: Cascade)
    questionId      String
    question        Question       @relation(fields: [questionId], references: [id], onDelete: Restrict)
    textValue       String?
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

  Also add the inverse relation field on `User` — find the existing `User` model and add `polls Poll[]` to its body (next to `refreshTokens`).

- [ ] **Step 2: Generate the migration**
  ```bash
  cd backend && DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
    npx prisma migrate dev --name polls_and_responses && cd ..
  ```
  Expected: a new `backend/prisma/migrations/<timestamp>_polls_and_responses/` directory; `prisma generate` runs and updates `@prisma/client`.

  If `prisma migrate dev` asks an interactive question (drift / reset), STOP and report — the dev DB should be in a clean migrated state from Plan 1.

- [ ] **Step 3: Verify the schema**
  ```bash
  PGPASSWORD=polls psql -h localhost -U polls -d survey_app -c '\dt'
  ```
  Expected: `User`, `RefreshToken`, `Poll`, `Question`, `Option`, `Response`, `Answer`, `AnswerOption`, `_prisma_migrations` (9 tables).

- [ ] **Step 4: Commit**
  ```bash
  git add backend/prisma/schema.prisma backend/prisma/migrations/
  git commit -m "feat(backend): prisma schema for polls, questions, responses, answers"
  ```

---

## Task 3: SlugService (TDD) — short random id with collision retry

**Files:**
- Create: `backend/src/polls/slug.service.ts`
- Create: `backend/src/polls/slug.service.spec.ts`

- [ ] **Step 1: Write the failing test**

  `backend/src/polls/slug.service.spec.ts`:
  ```ts
  import { Test } from '@nestjs/testing';
  import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
  import { PrismaService } from '../prisma/prisma.service';
  import { SlugService } from './slug.service';

  describe('SlugService', () => {
    let svc: SlugService;
    let prisma: DeepMockProxy<PrismaService>;

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [SlugService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      svc = mod.get(SlugService);
    });

    it('returns a fresh 10-char nanoid slug on first try', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(null);
      const slug = await svc.generate();
      expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
      expect(prisma.poll.findUnique).toHaveBeenCalledTimes(1);
    });

    it('retries on collision until it gets a free one', async () => {
      prisma.poll.findUnique
        .mockResolvedValueOnce({ id: 'x' } as any)
        .mockResolvedValueOnce({ id: 'x' } as any)
        .mockResolvedValueOnce(null);
      const slug = await svc.generate();
      expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
      expect(prisma.poll.findUnique).toHaveBeenCalledTimes(3);
    });

    it('gives up after the configured max attempts', async () => {
      prisma.poll.findUnique.mockResolvedValue({ id: 'x' } as any);
      await expect(svc.generate()).rejects.toThrow(/Could not allocate a unique slug/);
    });
  });
  ```

- [ ] **Step 2: Run — expect FAIL**
  ```bash
  npm --workspace backend test -- --testPathPattern=slug.service
  ```

- [ ] **Step 3: Implement**

  `backend/src/polls/slug.service.ts`:
  ```ts
  import { Injectable } from '@nestjs/common';
  import { nanoid } from 'nanoid';
  import { PrismaService } from '../prisma/prisma.service';

  const MAX_ATTEMPTS = 8;

  @Injectable()
  export class SlugService {
    constructor(private readonly prisma: PrismaService) {}

    async generate(): Promise<string> {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const slug = nanoid(10);
        const existing = await this.prisma.poll.findUnique({ where: { slug } });
        if (!existing) return slug;
      }
      throw new Error(`Could not allocate a unique slug after ${MAX_ATTEMPTS} attempts`);
    }
  }
  ```

- [ ] **Step 4: Run — expect PASS**
  ```bash
  npm --workspace backend test -- --testPathPattern=slug.service
  ```
  Expected: 3 tests pass.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/polls/slug.service.ts backend/src/polls/slug.service.spec.ts
  git commit -m "feat(backend): slug service with collision retry"
  ```

---

## Task 4: Poll DTOs

**Files (all in `backend/src/polls/dto/`):**
- Create: `option.dto.ts`
- Create: `question.dto.ts`
- Create: `create-poll.dto.ts`
- Create: `update-poll.dto.ts`
- Create: `toggle-active.dto.ts`
- Create: `poll-response.dto.ts`

- [ ] **Step 1: `option.dto.ts`**
  ```ts
  import { ApiProperty } from '@nestjs/swagger';
  import { IsString, MinLength, MaxLength } from 'class-validator';

  export class OptionInputDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    text!: string;
  }

  export class OptionDto {
    @ApiProperty() id!: string;
    @ApiProperty() text!: string;
    @ApiProperty() order!: number;
  }
  ```

- [ ] **Step 2: `question.dto.ts`**
  ```ts
  import { ApiProperty } from '@nestjs/swagger';
  import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
  import { Type } from 'class-transformer';
  import { QuestionType } from '@prisma/client';
  import { OptionInputDto, OptionDto } from './option.dto';

  export class QuestionInputDto {
    @ApiProperty({ enum: QuestionType })
    @IsEnum(QuestionType)
    type!: QuestionType;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    text!: string;

    @ApiProperty({ default: false })
    @IsBoolean()
    isRequired!: boolean;

    @ApiProperty({ type: [OptionInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OptionInputDto)
    @IsOptional()
    options?: OptionInputDto[];
  }

  export class QuestionDto {
    @ApiProperty() id!: string;
    @ApiProperty() order!: number;
    @ApiProperty({ enum: QuestionType }) type!: QuestionType;
    @ApiProperty() text!: string;
    @ApiProperty() isRequired!: boolean;
    @ApiProperty({ type: [OptionDto] }) options!: OptionDto[];
  }
  ```

- [ ] **Step 3: `create-poll.dto.ts`**
  ```ts
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { IsArray, IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength, ValidateNested, ArrayMinSize } from 'class-validator';
  import { Type } from 'class-transformer';
  import { Visibility } from '@prisma/client';
  import { QuestionInputDto } from './question.dto';

  export class CreatePollDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    title!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiProperty({ enum: Visibility, default: 'PRIVATE' })
    @IsEnum(Visibility)
    visibility!: Visibility;

    @ApiProperty({ default: true })
    @IsBoolean()
    isActive!: boolean;

    @ApiPropertyOptional({ type: String, format: 'date-time' })
    @IsOptional()
    @IsISO8601()
    expiresAt?: string;

    @ApiProperty({ type: [QuestionInputDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => QuestionInputDto)
    questions!: QuestionInputDto[];
  }
  ```

- [ ] **Step 4: `update-poll.dto.ts`**
  ```ts
  import { CreatePollDto } from './create-poll.dto';
  // PATCH /polls/:id accepts the same shape as POST /polls.
  // The service enforces "structural fields are read-only when responseCount > 0".
  export class UpdatePollDto extends CreatePollDto {}
  ```

- [ ] **Step 5: `toggle-active.dto.ts`**
  ```ts
  import { ApiProperty } from '@nestjs/swagger';
  import { IsBoolean } from 'class-validator';

  export class ToggleActiveDto {
    @ApiProperty()
    @IsBoolean()
    isActive!: boolean;
  }
  ```

- [ ] **Step 6: `poll-response.dto.ts`**
  ```ts
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { Visibility } from '@prisma/client';
  import { QuestionDto } from './question.dto';

  export class PollSummaryDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() title!: string;
    @ApiPropertyOptional() description?: string;
    @ApiProperty({ enum: Visibility }) visibility!: Visibility;
    @ApiProperty() isActive!: boolean;
    @ApiPropertyOptional({ type: String, format: 'date-time' }) expiresAt?: string;
    @ApiProperty() responseCount!: number;
    @ApiProperty() createdAt!: string;
  }

  export class PollDetailDto extends PollSummaryDto {
    @ApiProperty({ type: [QuestionDto] }) questions!: QuestionDto[];
  }

  export class PollListResponseDto {
    @ApiProperty({ type: [PollSummaryDto] }) items!: PollSummaryDto[];
    @ApiProperty() total!: number;
    @ApiProperty() page!: number;
    @ApiProperty() pageSize!: number;
  }
  ```

- [ ] **Step 7: Type-check**
  ```bash
  npm --workspace backend run check:ts
  ```
  Expected: clean.

- [ ] **Step 8: Commit**
  ```bash
  git add backend/src/polls/dto/
  git commit -m "feat(backend): poll DTOs (create/update/toggle-active/response)"
  ```

---

## Task 5: PollsService.create (TDD)

**Files:**
- Create: `backend/src/polls/polls.service.ts`
- Create: `backend/src/polls/polls.service.spec.ts`

- [ ] **Step 1: Write the failing test**

  `backend/src/polls/polls.service.spec.ts`:
  ```ts
  import { Test } from '@nestjs/testing';
  import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
  import { PrismaService } from '../prisma/prisma.service';
  import { SlugService } from './slug.service';
  import { PollsService } from './polls.service';
  import { QuestionType, Visibility } from '@prisma/client';

  describe('PollsService.create', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;
    let slug: DeepMockProxy<SlugService>;

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      slug = mockDeep<SlugService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: slug },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('creates a poll with nested questions and options, assigning order indices', async () => {
      slug.generate.mockResolvedValueOnce('abc1234567');
      prisma.poll.create.mockResolvedValueOnce({
        id: 'p1', slug: 'abc1234567', ownerId: 'u1', title: 'T',
        description: null, visibility: Visibility.PRIVATE, isActive: true,
        expiresAt: null, createdAt: new Date(), updatedAt: new Date(),
        questions: [
          { id: 'q1', order: 0, type: QuestionType.SINGLE_CHOICE, text: 'Color?', isRequired: true,
            options: [{ id: 'o1', order: 0, text: 'Red' }, { id: 'o2', order: 1, text: 'Blue' }] },
          { id: 'q2', order: 1, type: QuestionType.TEXT, text: 'Why?', isRequired: false, options: [] },
        ],
      } as any);

      const r = await svc.create('u1', {
        title: 'T', visibility: Visibility.PRIVATE, isActive: true,
        questions: [
          { type: QuestionType.SINGLE_CHOICE, text: 'Color?', isRequired: true,
            options: [{ text: 'Red' }, { text: 'Blue' }] },
          { type: QuestionType.TEXT, text: 'Why?', isRequired: false },
        ],
      });

      // The orders must be assigned by the service, not trusted from input.
      const callArg = prisma.poll.create.mock.calls[0][0] as any;
      const qs = callArg.data.questions.create as any[];
      expect(qs[0].order).toBe(0);
      expect(qs[1].order).toBe(1);
      const opts = qs[0].options.create as any[];
      expect(opts[0].order).toBe(0);
      expect(opts[1].order).toBe(1);
      // TEXT questions: no options to nest.
      expect(qs[1].options).toBeUndefined();

      expect(r.slug).toBe('abc1234567');
    });
  });
  ```

- [ ] **Step 2: Run — FAIL**
  ```bash
  npm --workspace backend test -- --testPathPattern=polls.service
  ```

- [ ] **Step 3: Implement**

  `backend/src/polls/polls.service.ts`:
  ```ts
  import { BadRequestException, Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
  import { Prisma, QuestionType } from '@prisma/client';
  import { PrismaService } from '../prisma/prisma.service';
  import { SlugService } from './slug.service';
  import { CreatePollDto } from './dto/create-poll.dto';
  import { UpdatePollDto } from './dto/update-poll.dto';

  @Injectable()
  export class PollsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly slug: SlugService,
    ) {}

    async create(ownerId: string, dto: CreatePollDto) {
      this.validateQuestions(dto.questions);
      const slug = await this.slug.generate();
      return this.prisma.poll.create({
        data: {
          slug,
          ownerId,
          title: dto.title,
          description: dto.description ?? null,
          visibility: dto.visibility,
          isActive: dto.isActive,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          questions: {
            create: dto.questions.map((q, qi) => ({
              order: qi,
              type: q.type,
              text: q.text,
              isRequired: q.isRequired,
              ...(q.type === QuestionType.TEXT
                ? {}
                : {
                    options: {
                      create: (q.options ?? []).map((o, oi) => ({ order: oi, text: o.text })),
                    },
                  }),
            })),
          },
        },
        include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
      });
    }

    private validateQuestions(qs: CreatePollDto['questions']) {
      for (const q of qs) {
        if (q.type === QuestionType.TEXT) continue;
        const opts = q.options ?? [];
        if (opts.length < 2) {
          throw new BadRequestException({
            code: 'VALIDATION_FAILED',
            message: `Question "${q.text}" requires at least 2 options`,
          });
        }
      }
    }
  }
  ```

- [ ] **Step 4: Run — PASS**
  ```bash
  npm --workspace backend test -- --testPathPattern=polls.service
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/polls/polls.service.ts backend/src/polls/polls.service.spec.ts
  git commit -m "feat(backend): PollsService.create with nested questions/options"
  ```

---

## Task 6: PollsService.findMine + findOne (owner-scoped) (TDD)

**Files:**
- Modify: `backend/src/polls/polls.service.ts`
- Modify: `backend/src/polls/polls.service.spec.ts`

- [ ] **Step 1: Append failing tests**

  Add to the existing spec file:
  ```ts
  describe('PollsService.findMine', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: mockDeep<SlugService>() },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('returns owner polls paginated newest-first with response counts', async () => {
      prisma.$transaction.mockResolvedValueOnce([
        [
          { id: 'p2', slug: 's2', title: 'B', description: null, visibility: 'PRIVATE',
            isActive: true, expiresAt: null, createdAt: new Date(), _count: { responses: 3 } },
          { id: 'p1', slug: 's1', title: 'A', description: 'd', visibility: 'PUBLIC',
            isActive: false, expiresAt: null, createdAt: new Date(), _count: { responses: 0 } },
        ],
        2,
      ] as any);

      const r = await svc.findMine('u1', { page: 1, pageSize: 20 });
      expect(r.total).toBe(2);
      expect(r.items[0].id).toBe('p2');
      expect(r.items[0].responseCount).toBe(3);
      expect(r.items[1].responseCount).toBe(0);
    });
  });

  describe('PollsService.findOne (owner-scoped)', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: mockDeep<SlugService>() },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('returns the poll with questions, options, responseCount for the owner', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce({
        id: 'p1', slug: 's', ownerId: 'u1', title: 'T', description: null,
        visibility: 'PRIVATE', isActive: true, expiresAt: null,
        createdAt: new Date(), updatedAt: new Date(),
        questions: [], _count: { responses: 5 },
      } as any);

      const p = await svc.findOne('u1', 'p1');
      expect(p.id).toBe('p1');
      expect(p.responseCount).toBe(5);
    });

    it('throws 404 when poll is not owned by the user', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce(null);
      await expect(svc.findOne('u1', 'p1')).rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });
  ```

- [ ] **Step 2: Run — FAIL**
  ```bash
  npm --workspace backend test -- --testPathPattern=polls.service
  ```

- [ ] **Step 3: Implement — add methods to `PollsService`**

  ```ts
  async findMine(ownerId: string, q: { page: number; pageSize: number }) {
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        skip, take: q.pageSize,
        select: {
          id: true, slug: true, title: true, description: true,
          visibility: true, isActive: true, expiresAt: true,
          createdAt: true, _count: { select: { responses: true } },
        },
      }),
      this.prisma.poll.count({ where: { ownerId } }),
    ]);
    return {
      items: rows.map((r) => this.toSummary(r)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async findOne(ownerId: string, id: string) {
    const p = await this.prisma.poll.findFirst({
      where: { id, ownerId },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
    return this.toDetail(p);
  }

  private toSummary(r: any) {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description ?? undefined,
      visibility: r.visibility,
      isActive: r.isActive,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(),
      responseCount: r._count.responses,
    };
  }

  private toDetail(r: any) {
    return {
      ...this.toSummary(r),
      questions: r.questions.map((q: any) => ({
        id: q.id, order: q.order, type: q.type, text: q.text, isRequired: q.isRequired,
        options: q.options.map((o: any) => ({ id: o.id, order: o.order, text: o.text })),
      })),
    };
  }
  ```

- [ ] **Step 4: Run — PASS**
  ```bash
  npm --workspace backend test -- --testPathPattern=polls.service
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/polls/polls.service.ts backend/src/polls/polls.service.spec.ts
  git commit -m "feat(backend): PollsService findMine + findOne (owner-scoped)"
  ```

---

## Task 7: PollsService.update with edit-lock rule (TDD)

**Files:**
- Modify: `backend/src/polls/polls.service.ts`
- Modify: `backend/src/polls/polls.service.spec.ts`

- [ ] **Step 1: Append failing tests**

  ```ts
  describe('PollsService.update (edit-lock)', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;

    function existingPoll(responseCount: number, overrides: any = {}) {
      return {
        id: 'p1', slug: 's', ownerId: 'u1', title: 'T', description: null,
        visibility: 'PRIVATE' as const, isActive: true, expiresAt: null,
        createdAt: new Date(), updatedAt: new Date(),
        questions: [
          { id: 'q1', order: 0, type: 'SINGLE_CHOICE', text: 'Q', isRequired: true,
            options: [{ id: 'o1', order: 0, text: 'A' }, { id: 'o2', order: 1, text: 'B' }] },
        ],
        _count: { responses: responseCount },
        ...overrides,
      };
    }

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: mockDeep<SlugService>() },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('allows metadata-only edits when responses exist', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce(existingPoll(2) as any);
      prisma.poll.update.mockResolvedValueOnce({} as any);
      prisma.poll.findFirst.mockResolvedValueOnce(existingPoll(2, { title: 'NEW' }) as any);

      await svc.update('u1', 'p1', {
        title: 'NEW', description: 'd',
        visibility: 'PUBLIC' as any, isActive: false,
        expiresAt: '2030-01-01T00:00:00.000Z',
        questions: [
          { type: 'SINGLE_CHOICE' as any, text: 'Q', isRequired: true,
            options: [{ text: 'A' }, { text: 'B' }] }, // same structure
        ],
      });

      const args = prisma.poll.update.mock.calls[0][0] as any;
      // No `questions` write — only metadata.
      expect(args.data.questions).toBeUndefined();
      expect(args.data.title).toBe('NEW');
    });

    it('rejects structural edits when responses exist', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce(existingPoll(1) as any);

      await expect(svc.update('u1', 'p1', {
        title: 'T', visibility: 'PRIVATE' as any, isActive: true,
        questions: [
          { type: 'SINGLE_CHOICE' as any, text: 'Q', isRequired: true,
            options: [{ text: 'A' }, { text: 'C' /* changed */ }] },
        ],
      })).rejects.toThrow(/POLL_LOCKED_HAS_RESPONSES/);
    });

    it('allows full structural rewrite when no responses', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce(existingPoll(0) as any);
      prisma.$transaction.mockResolvedValueOnce({} as any);
      prisma.poll.findFirst.mockResolvedValueOnce(existingPoll(0) as any);

      await svc.update('u1', 'p1', {
        title: 'T', visibility: 'PRIVATE' as any, isActive: true,
        questions: [
          { type: 'TEXT' as any, text: 'New question', isRequired: false },
        ],
      });

      // Transaction is used so deletes + recreates are atomic.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws NOT_FOUND when poll missing or not owned', async () => {
      prisma.poll.findFirst.mockResolvedValueOnce(null);
      await expect(svc.update('u1', 'p1', {} as any))
        .rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });
  ```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement — add `update` to `PollsService`**

  ```ts
  async update(ownerId: string, id: string, dto: UpdatePollDto) {
    const existing = await this.prisma.poll.findFirst({
      where: { id, ownerId },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });

    const hasResponses = existing._count.responses > 0;

    if (hasResponses) {
      if (this.structuralDiff(existing, dto)) {
        throw new ConflictException({
          code: 'POLL_LOCKED_HAS_RESPONSES',
          message: 'Questions and options cannot change after a poll has responses',
        });
      }
      // metadata-only update
      await this.prisma.poll.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description ?? null,
          visibility: dto.visibility,
          isActive: dto.isActive,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
    } else {
      // full rewrite — delete questions (cascades to options), recreate from dto
      this.validateQuestions(dto.questions);
      await this.prisma.$transaction([
        this.prisma.question.deleteMany({ where: { pollId: id } }),
        this.prisma.poll.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description ?? null,
            visibility: dto.visibility,
            isActive: dto.isActive,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            questions: {
              create: dto.questions.map((q, qi) => ({
                order: qi, type: q.type, text: q.text, isRequired: q.isRequired,
                ...(q.type === QuestionType.TEXT ? {} : {
                  options: { create: (q.options ?? []).map((o, oi) => ({ order: oi, text: o.text })) },
                }),
              })),
            },
          },
        }),
      ]);
    }
    return this.findOne(ownerId, id);
  }

  private structuralDiff(existing: any, dto: UpdatePollDto): boolean {
    if (existing.questions.length !== dto.questions.length) return true;
    for (let i = 0; i < existing.questions.length; i++) {
      const a = existing.questions[i];
      const b = dto.questions[i];
      if (a.type !== b.type) return true;
      if (a.text !== b.text) return true;
      if (a.isRequired !== b.isRequired) return true;
      const aOpts = a.options ?? [];
      const bOpts = b.options ?? [];
      if (aOpts.length !== bOpts.length) return true;
      for (let j = 0; j < aOpts.length; j++) {
        if (aOpts[j].text !== bOpts[j].text) return true;
      }
    }
    return false;
  }
  ```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/polls/polls.service.ts backend/src/polls/polls.service.spec.ts
  git commit -m "feat(backend): PollsService.update with edit-lock rule"
  ```

---

## Task 8: PollsService.delete + toggleActive (TDD)

**Files:**
- Modify: `backend/src/polls/polls.service.ts`
- Modify: `backend/src/polls/polls.service.spec.ts`

- [ ] **Step 1: Append failing tests**

  ```ts
  describe('PollsService.delete', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;
    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: mockDeep<SlugService>() },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('deletes the poll when owned', async () => {
      prisma.poll.deleteMany.mockResolvedValueOnce({ count: 1 } as any);
      await svc.delete('u1', 'p1');
      expect(prisma.poll.deleteMany).toHaveBeenCalledWith({ where: { id: 'p1', ownerId: 'u1' } });
    });
    it('throws NOT_FOUND when nothing deleted', async () => {
      prisma.poll.deleteMany.mockResolvedValueOnce({ count: 0 } as any);
      await expect(svc.delete('u1', 'p1')).rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });

  describe('PollsService.toggleActive', () => {
    let svc: PollsService;
    let prisma: DeepMockProxy<PrismaService>;
    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [
          PollsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SlugService, useValue: mockDeep<SlugService>() },
        ],
      }).compile();
      svc = mod.get(PollsService);
    });

    it('updates isActive when owned', async () => {
      prisma.poll.updateMany.mockResolvedValueOnce({ count: 1 } as any);
      await svc.toggleActive('u1', 'p1', false);
      expect(prisma.poll.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', ownerId: 'u1' },
        data: { isActive: false },
      });
    });
    it('throws NOT_FOUND when nothing updated', async () => {
      prisma.poll.updateMany.mockResolvedValueOnce({ count: 0 } as any);
      await expect(svc.toggleActive('u1', 'p1', true)).rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });
  ```

- [ ] **Step 2: Implement**

  Add to `PollsService`:
  ```ts
  async delete(ownerId: string, id: string) {
    const r = await this.prisma.poll.deleteMany({ where: { id, ownerId } });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
  }

  async toggleActive(ownerId: string, id: string, isActive: boolean) {
    const r = await this.prisma.poll.updateMany({
      where: { id, ownerId },
      data: { isActive },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
  }
  ```

- [ ] **Step 3: Run — expect all 11+ tests pass**
  ```bash
  npm --workspace backend test -- --testPathPattern=polls.service
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add backend/src/polls/polls.service.ts backend/src/polls/polls.service.spec.ts
  git commit -m "feat(backend): PollsService.delete + toggleActive"
  ```

---

## Task 9: PollsController + PollsModule + smoke

**Files:**
- Create: `backend/src/polls/polls.controller.ts`
- Create: `backend/src/polls/polls.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: PollsController**

  `backend/src/polls/polls.controller.ts`:
  ```ts
  import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
  import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
  import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
  import { PollsService } from './polls.service';
  import { CreatePollDto } from './dto/create-poll.dto';
  import { UpdatePollDto } from './dto/update-poll.dto';
  import { ToggleActiveDto } from './dto/toggle-active.dto';
  import { PollDetailDto, PollListResponseDto, PollSummaryDto } from './dto/poll-response.dto';

  @ApiTags('polls')
  @Controller('polls')
  export class PollsController {
    constructor(private readonly polls: PollsService) {}

    @Get()
    @ApiOkResponse({ type: PollListResponseDto })
    list(
      @CurrentUser() user: CurrentUserPayload,
      @Query('page') page = '1',
      @Query('pageSize') pageSize = '20',
    ): Promise<PollListResponseDto> {
      return this.polls.findMine(user.id, { page: Number(page), pageSize: Number(pageSize) }) as any;
    }

    @Post()
    @ApiCreatedResponse({ type: PollDetailDto })
    create(@CurrentUser() user: CurrentUserPayload, @Body() body: CreatePollDto) {
      return this.polls.create(user.id, body) as any;
    }

    @Get(':id')
    @ApiOkResponse({ type: PollDetailDto })
    get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
      return this.polls.findOne(user.id, id);
    }

    @Patch(':id')
    @ApiOkResponse({ type: PollDetailDto })
    update(
      @CurrentUser() user: CurrentUserPayload,
      @Param('id') id: string,
      @Body() body: UpdatePollDto,
    ) {
      return this.polls.update(user.id, id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
      await this.polls.delete(user.id, id);
    }

    @Patch(':id/active')
    @ApiOkResponse({ type: PollSummaryDto })
    async toggleActive(
      @CurrentUser() user: CurrentUserPayload,
      @Param('id') id: string,
      @Body() body: ToggleActiveDto,
    ) {
      await this.polls.toggleActive(user.id, id, body.isActive);
      return this.polls.findOne(user.id, id);
    }
  }
  ```

- [ ] **Step 2: PollsModule**
  ```ts
  import { Module } from '@nestjs/common';
  import { PollsController } from './polls.controller';
  import { PollsService } from './polls.service';
  import { SlugService } from './slug.service';

  @Module({
    controllers: [PollsController],
    providers: [PollsService, SlugService],
    exports: [PollsService],
  })
  export class PollsModule {}
  ```

- [ ] **Step 3: Wire into AppModule**

  Add `import { PollsModule } from './polls/polls.module';` and add `PollsModule` to the `imports` array in `app.module.ts`.

- [ ] **Step 4: Smoke**
  ```bash
  pkill -f 'node backend/dist/main.js' 2>/dev/null || true
  npm --workspace backend run build && \
    DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
    JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' \
    NODE_ENV='development' node backend/dist/main.js &
  sleep 3

  COOKIES=/tmp/polls-smoke.txt
  rm -f "$COOKIES"
  curl -sf -c "$COOKIES" -X POST http://localhost:3000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@polls.local","password":"admin"}' >/dev/null
  # Create
  CREATED=$(curl -sf -b "$COOKIES" -X POST http://localhost:3000/api/v1/polls \
    -H 'Content-Type: application/json' \
    -d '{"title":"Smoke poll","visibility":"PRIVATE","isActive":true,"questions":[{"type":"SINGLE_CHOICE","text":"Pick one","isRequired":true,"options":[{"text":"A"},{"text":"B"}]}]}')
  echo "$CREATED"
  POLL_ID=$(echo "$CREATED" | grep -oE '"id":"[^"]+' | head -1 | cut -d'"' -f4)
  # List
  curl -sf -b "$COOKIES" "http://localhost:3000/api/v1/polls?page=1&pageSize=10"
  echo
  # Get
  curl -sf -b "$COOKIES" "http://localhost:3000/api/v1/polls/$POLL_ID" >/dev/null && echo "get OK"
  # Toggle active
  curl -sf -b "$COOKIES" -X PATCH "http://localhost:3000/api/v1/polls/$POLL_ID/active" \
    -H 'Content-Type: application/json' -d '{"isActive":false}' >/dev/null && echo "toggle OK"
  # Delete
  curl -sf -b "$COOKIES" -X DELETE "http://localhost:3000/api/v1/polls/$POLL_ID" \
    -o /dev/null -w "delete -> %{http_code}\n"

  kill %1 2>/dev/null || true
  ```
  Expected: create returns a poll JSON with `id`, `slug`, `questions[]`; list returns items including it; get OK; toggle OK; delete → 204.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/polls/polls.controller.ts backend/src/polls/polls.module.ts backend/src/app.module.ts
  git commit -m "feat(backend): polls controller wired into AppModule"
  ```

---

## Task 10: ResponsesService.getPublic (TDD)

**Files:**
- Create: `backend/src/responses/responses.service.ts`
- Create: `backend/src/responses/responses.service.spec.ts`
- Create: `backend/src/responses/dto/public-poll.dto.ts`

- [ ] **Step 1: DTO**

  `backend/src/responses/dto/public-poll.dto.ts`:
  ```ts
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { QuestionDto } from '../../polls/dto/question.dto';

  export class PublicPollDto {
    @ApiProperty() id!: string;
    @ApiProperty() title!: string;
    @ApiPropertyOptional() description?: string;
    @ApiPropertyOptional({ type: String, format: 'date-time' }) expiresAt?: string;
    @ApiProperty() closed!: boolean;
    @ApiProperty({ type: [QuestionDto] }) questions!: QuestionDto[];
  }
  ```

- [ ] **Step 2: Failing test**

  `backend/src/responses/responses.service.spec.ts`:
  ```ts
  import { Test } from '@nestjs/testing';
  import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
  import { PrismaService } from '../prisma/prisma.service';
  import { ResponsesService } from './responses.service';

  describe('ResponsesService.getPublic', () => {
    let svc: ResponsesService;
    let prisma: DeepMockProxy<PrismaService>;

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [ResponsesService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      svc = mod.get(ResponsesService);
    });

    const basePoll = {
      id: 'p1', title: 'T', description: null, isActive: true, expiresAt: null,
      questions: [
        { id: 'q1', order: 0, type: 'SINGLE_CHOICE', text: 'Pick', isRequired: true,
          options: [{ id: 'o1', order: 0, text: 'A' }, { id: 'o2', order: 1, text: 'B' }] },
      ],
    };

    it('returns the poll with closed=false when active and not expired', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(basePoll as any);
      const r = await svc.getPublic('abc');
      expect(r.closed).toBe(false);
      expect(r.questions[0].options.length).toBe(2);
    });

    it('returns closed=true when isActive=false', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce({ ...basePoll, isActive: false } as any);
      expect((await svc.getPublic('abc')).closed).toBe(true);
    });

    it('returns closed=true when expiresAt is in the past', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce({
        ...basePoll, expiresAt: new Date(Date.now() - 1000),
      } as any);
      expect((await svc.getPublic('abc')).closed).toBe(true);
    });

    it('throws NOT_FOUND for unknown slug', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(null);
      await expect(svc.getPublic('nope')).rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });
  ```

- [ ] **Step 3: Run — FAIL**

- [ ] **Step 4: Implement**

  `backend/src/responses/responses.service.ts`:
  ```ts
  import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
  import { Prisma, QuestionType } from '@prisma/client';
  import { PrismaService } from '../prisma/prisma.service';

  @Injectable()
  export class ResponsesService {
    constructor(private readonly prisma: PrismaService) {}

    async getPublic(slug: string) {
      const poll = await this.prisma.poll.findUnique({
        where: { slug },
        include: {
          questions: {
            include: { options: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
      const closed = !poll.isActive || (!!poll.expiresAt && poll.expiresAt.getTime() < Date.now());
      return {
        id: poll.id,
        title: poll.title,
        description: poll.description ?? undefined,
        expiresAt: poll.expiresAt ? poll.expiresAt.toISOString() : undefined,
        closed,
        questions: poll.questions.map((q) => ({
          id: q.id, order: q.order, type: q.type, text: q.text, isRequired: q.isRequired,
          options: q.options.map((o) => ({ id: o.id, order: o.order, text: o.text })),
        })),
      };
    }
  }
  ```

- [ ] **Step 5: Run — PASS**

- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/responses/
  git commit -m "feat(backend): ResponsesService.getPublic with closed flag"
  ```

---

## Task 11: ResponsesService.submit — cookie dedup + closed checks + answer validation (TDD)

**Files:**
- Modify: `backend/src/responses/responses.service.ts`
- Modify: `backend/src/responses/responses.service.spec.ts`
- Create: `backend/src/responses/dto/submit-response.dto.ts`

- [ ] **Step 1: DTO**

  `backend/src/responses/dto/submit-response.dto.ts`:
  ```ts
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { IsArray, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
  import { Type } from 'class-transformer';

  export class AnswerInputDto {
    @ApiProperty()
    @IsString()
    questionId!: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    optionIds?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    textValue?: string;
  }

  export class SubmitResponseDto {
    @ApiProperty({ type: [AnswerInputDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => AnswerInputDto)
    answers!: AnswerInputDto[];
  }

  export class SubmitResultDto {
    @ApiProperty() submittedAt!: string;
  }
  ```

- [ ] **Step 2: Append failing tests**

  ```ts
  import { QuestionType } from '@prisma/client';

  describe('ResponsesService.submit', () => {
    let svc: ResponsesService;
    let prisma: DeepMockProxy<PrismaService>;

    function pollWith(opts: Partial<{ isActive: boolean; expiresAt: Date | null; questions: any[] }> = {}) {
      return {
        id: 'p1', isActive: true, expiresAt: null,
        questions: [
          { id: 'q1', type: QuestionType.SINGLE_CHOICE, isRequired: true,
            options: [{ id: 'o1' }, { id: 'o2' }] },
          { id: 'q2', type: QuestionType.MULTIPLE_CHOICE, isRequired: false,
            options: [{ id: 'o3' }, { id: 'o4' }] },
          { id: 'q3', type: QuestionType.TEXT, isRequired: true, options: [] },
        ],
        ...opts,
      };
    }

    beforeEach(async () => {
      prisma = mockDeep<PrismaService>();
      const mod = await Test.createTestingModule({
        providers: [ResponsesService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      svc = mod.get(ResponsesService);
    });

    it('happy path: persists Response + Answers + AnswerOption rows', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      prisma.$transaction.mockResolvedValueOnce({ id: 'resp1', createdAt: new Date('2026-05-26T00:00:00Z') } as any);

      const r = await svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [
          { questionId: 'q1', optionIds: ['o1'] },
          { questionId: 'q2', optionIds: ['o3', 'o4'] },
          { questionId: 'q3', textValue: 'Yes' },
        ],
      });

      expect(r.submittedAt).toBe('2026-05-26T00:00:00.000Z');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns 403 POLL_CLOSED when isActive=false', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith({ isActive: false }) as any);
      await expect(svc.submit({ slug: 's', respondentCookie: 'c1', answers: [] }))
        .rejects.toThrow(/POLL_CLOSED/);
    });

    it('returns 403 POLL_CLOSED when expiresAt past', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith({ expiresAt: new Date(Date.now() - 1000) }) as any);
      await expect(svc.submit({ slug: 's', respondentCookie: 'c1', answers: [] }))
        .rejects.toThrow(/POLL_CLOSED/);
    });

    it('returns 409 ALREADY_RESPONDED on unique-constraint violation', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' } as any),
      );
      await expect(svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [
          { questionId: 'q1', optionIds: ['o1'] },
          { questionId: 'q3', textValue: 'Y' },
        ],
      })).rejects.toThrow(/ALREADY_RESPONDED/);
    });

    it('rejects missing required answer', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      await expect(svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [{ questionId: 'q1', optionIds: ['o1'] }], // missing q3
      })).rejects.toThrow(/VALIDATION_FAILED/);
    });

    it('rejects SINGLE_CHOICE with multiple optionIds', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      await expect(svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [
          { questionId: 'q1', optionIds: ['o1', 'o2'] },
          { questionId: 'q3', textValue: 'Y' },
        ],
      })).rejects.toThrow(/VALIDATION_FAILED/);
    });

    it('rejects optionId not belonging to this question', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      await expect(svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [
          { questionId: 'q1', optionIds: ['o3'] }, // o3 belongs to q2
          { questionId: 'q3', textValue: 'Y' },
        ],
      })).rejects.toThrow(/VALIDATION_FAILED/);
    });

    it('rejects TEXT required with empty textValue', async () => {
      prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
      await expect(svc.submit({
        slug: 's', respondentCookie: 'c1',
        answers: [
          { questionId: 'q1', optionIds: ['o1'] },
          { questionId: 'q3', textValue: '  ' },
        ],
      })).rejects.toThrow(/VALIDATION_FAILED/);
    });
  });
  ```

- [ ] **Step 3: Run — FAIL**

- [ ] **Step 4: Implement — add `submit` to `ResponsesService`**

  ```ts
  async submit(args: { slug: string; respondentCookie: string; answers: { questionId: string; optionIds?: string[]; textValue?: string }[] }): Promise<{ submittedAt: string }> {
    const poll = await this.prisma.poll.findUnique({
      where: { slug: args.slug },
      include: { questions: { include: { options: true } } },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
    const closed = !poll.isActive || (!!poll.expiresAt && poll.expiresAt.getTime() < Date.now());
    if (closed) throw new ForbiddenException({ code: 'POLL_CLOSED', message: 'This poll is closed' });

    this.validateAnswers(poll, args.answers);

    try {
      const created = await this.prisma.response.create({
        data: {
          pollId: poll.id,
          respondentCookie: args.respondentCookie,
          answers: {
            create: args.answers.map((a) => {
              const q = poll.questions.find((q) => q.id === a.questionId)!;
              const isText = q.type === QuestionType.TEXT;
              return {
                questionId: a.questionId,
                textValue: isText ? (a.textValue ?? null) : null,
                ...(isText
                  ? {}
                  : {
                      selectedOptions: {
                        create: (a.optionIds ?? []).map((optionId) => ({ optionId })),
                      },
                    }),
              };
            }),
          },
        },
      });
      return { submittedAt: created.createdAt.toISOString() };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'ALREADY_RESPONDED', message: 'You have already answered this poll' });
      }
      throw e;
    }
  }

  private validateAnswers(poll: any, answers: { questionId: string; optionIds?: string[]; textValue?: string }[]) {
    const byQ = new Map(poll.questions.map((q: any) => [q.id, q]));
    const answered = new Map(answers.map((a) => [a.questionId, a]));

    // Required questions must be answered.
    for (const q of poll.questions) {
      if (q.isRequired && !answered.has(q.id)) {
        this.fail(`Question "${q.text}" is required`);
      }
    }

    for (const a of answers) {
      const q: any = byQ.get(a.questionId);
      if (!q) this.fail(`Unknown questionId: ${a.questionId}`);

      if (q.type === QuestionType.TEXT) {
        if (q.isRequired && !(a.textValue ?? '').trim()) {
          this.fail(`Question "${q.text}" requires a text answer`);
        }
        continue;
      }

      const ids = a.optionIds ?? [];
      const allOwned = ids.every((id: string) => q.options.some((o: any) => o.id === id));
      if (!allOwned) this.fail(`Option does not belong to question "${q.text}"`);

      if (q.type === QuestionType.SINGLE_CHOICE) {
        if (ids.length !== 1) this.fail(`Question "${q.text}" needs exactly one option`);
      } else if (q.type === QuestionType.MULTIPLE_CHOICE) {
        if (ids.length < 1) this.fail(`Question "${q.text}" needs at least one option`);
      }
    }
  }

  private fail(msg: string): never {
    throw new BadRequestException({ code: 'VALIDATION_FAILED', message: msg });
  }
  ```

  Also add the import for `Prisma` from `@prisma/client` at the top of the file.

- [ ] **Step 5: Run — PASS (8 tests total in this file)**

- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/responses/responses.service.ts backend/src/responses/responses.service.spec.ts \
    backend/src/responses/dto/submit-response.dto.ts
  git commit -m "feat(backend): ResponsesService.submit with dedup + validation"
  ```

---

## Task 12: ResponsesController + module wiring + smoke

**Files:**
- Create: `backend/src/responses/responses.controller.ts`
- Create: `backend/src/responses/responses.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Controller**

  `backend/src/responses/responses.controller.ts`:
  ```ts
  import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
  import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
  import type { Request, Response } from 'express';
  import { randomUUID } from 'node:crypto';
  import { Public } from '../common/decorators/public.decorator';
  import { ResponsesService } from './responses.service';
  import { PublicPollDto } from './dto/public-poll.dto';
  import { SubmitResponseDto, SubmitResultDto } from './dto/submit-response.dto';

  @ApiTags('public')
  @Controller('public/polls')
  export class ResponsesController {
    constructor(private readonly svc: ResponsesService) {}

    @Get(':slug')
    @Public()
    @ApiOkResponse({ type: PublicPollDto })
    async getPublic(@Param('slug') slug: string): Promise<PublicPollDto> {
      return this.svc.getPublic(slug) as any;
    }

    @Post(':slug/responses')
    @Public()
    @HttpCode(201)
    @ApiCreatedResponse({ type: SubmitResultDto })
    async submit(
      @Param('slug') slug: string,
      @Body() body: SubmitResponseDto,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
    ): Promise<SubmitResultDto> {
      // Resolve the public poll first so we know its id for the cookie name.
      const poll = await this.svc.getPublic(slug);
      const cookieName = `respondent_${poll.id}`;
      let cookieVal: string | undefined = req.cookies?.[cookieName];
      if (!cookieVal) {
        cookieVal = randomUUID();
        res.cookie(cookieName, cookieVal, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: `/api/v1/public/polls/${slug}`,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }
      return this.svc.submit({ slug, respondentCookie: cookieVal, answers: body.answers });
    }
  }
  ```

- [ ] **Step 2: ResponsesModule**
  ```ts
  import { Module } from '@nestjs/common';
  import { ResponsesController } from './responses.controller';
  import { ResponsesService } from './responses.service';

  @Module({
    controllers: [ResponsesController],
    providers: [ResponsesService],
    exports: [ResponsesService],
  })
  export class ResponsesModule {}
  ```

- [ ] **Step 3: Wire into AppModule** — add to imports.

- [ ] **Step 4: Smoke (mixing owner + anonymous)**
  ```bash
  pkill -f 'node backend/dist/main.js' 2>/dev/null || true
  npm --workspace backend run build && \
    DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
    JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' \
    NODE_ENV='development' node backend/dist/main.js &
  sleep 3

  AUTH=/tmp/owner-cookies.txt
  ANON=/tmp/anon-cookies.txt
  rm -f "$AUTH" "$ANON"

  curl -sf -c "$AUTH" -X POST http://localhost:3000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@polls.local","password":"admin"}' >/dev/null

  CREATED=$(curl -sf -b "$AUTH" -X POST http://localhost:3000/api/v1/polls \
    -H 'Content-Type: application/json' \
    -d '{"title":"Lunch","visibility":"PUBLIC","isActive":true,"questions":[{"type":"SINGLE_CHOICE","text":"Pick","isRequired":true,"options":[{"text":"Pizza"},{"text":"Salad"}]}]}')
  SLUG=$(echo "$CREATED" | grep -oE '"slug":"[^"]+' | head -1 | cut -d'"' -f4)
  echo "slug=$SLUG"

  # Public poll view
  curl -sf "http://localhost:3000/api/v1/public/polls/$SLUG" >/dev/null && echo "public GET ok"

  # First submission as anon
  QID=$(echo "$CREATED" | grep -oE '"questions":\[\{"id":"[^"]+' | grep -oE '"id":"[^"]+' | tail -1 | cut -d'"' -f4)
  OID=$(echo "$CREATED" | grep -oE '"options":\[\{"id":"[^"]+' | grep -oE '"id":"[^"]+' | tail -1 | cut -d'"' -f4)
  curl -sf -c "$ANON" -X POST "http://localhost:3000/api/v1/public/polls/$SLUG/responses" \
    -H 'Content-Type: application/json' \
    -d "{\"answers\":[{\"questionId\":\"$QID\",\"optionIds\":[\"$OID\"]}]}"
  echo

  # Second submission with same cookie → 409 ALREADY_RESPONDED
  curl -s -b "$ANON" -X POST "http://localhost:3000/api/v1/public/polls/$SLUG/responses" \
    -H 'Content-Type: application/json' \
    -d "{\"answers\":[{\"questionId\":\"$QID\",\"optionIds\":[\"$OID\"]}]}" \
    -o /dev/null -w "second submission -> %{http_code}\n"

  kill %1 2>/dev/null || true
  ```
  Expected: slug printed, public GET ok, first submission returns JSON with `submittedAt`, second → `409`.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/responses/responses.controller.ts backend/src/responses/responses.module.ts backend/src/app.module.ts
  git commit -m "feat(backend): public responses controller with cookie dedup"
  ```

---

## Task 13: Backend e2e — polls + responses happy path + edit-lock + dedup

**Files:**
- Create: `backend/test/polls.e2e-spec.ts`
- Create: `backend/test/responses.e2e-spec.ts`

- [ ] **Step 1: Polls e2e**

  `backend/test/polls.e2e-spec.ts`: copy the structure of the existing `auth.e2e-spec.ts` for the Testcontainers boilerplate; the test bodies must cover:
  ```
  - register a user, login (capture access cookie)
  - POST /polls with valid body → 201, slug returned
  - GET /polls → contains the poll
  - GET /polls/:id → full structure including questions/options
  - PATCH /polls/:id with metadata change → 200
  - PATCH /polls/:id with structural change (after a response exists) → 409 POLL_LOCKED_HAS_RESPONSES
  - PATCH /polls/:id/active → flips isActive
  - DELETE /polls/:id → 204; subsequent GET → 404
  ```

  Use the same `beforeAll`/`afterAll` Testcontainers setup. Use `request.agent(app.getHttpServer())` for the owner. For the "after a response exists" precondition, hit `POST /public/polls/:slug/responses` first.

- [ ] **Step 2: Responses e2e**

  `backend/test/responses.e2e-spec.ts` must cover:
  ```
  - GET /public/polls/:slug → closed=false when active+not-expired
  - POST first submission → 201, cookie set
  - POST second submission (same agent) → 409 ALREADY_RESPONDED
  - POST against an inactive poll → 403 POLL_CLOSED
  - POST against an expired poll → 403 POLL_CLOSED
  - POST missing required question → 400 VALIDATION_FAILED
  - POST SINGLE_CHOICE with 2 optionIds → 400 VALIDATION_FAILED
  ```

- [ ] **Step 3: Run**
  ```bash
  pkill -f 'node backend/dist/main.js' 2>/dev/null || true
  npm --workspace backend run test:e2e
  ```
  Expected: every spec file passes — auth (3) + polls (8 or so) + responses (7 or so). All green.

- [ ] **Step 4: Commit**
  ```bash
  git add backend/test/polls.e2e-spec.ts backend/test/responses.e2e-spec.ts
  git commit -m "test(backend): polls + responses e2e coverage"
  ```

---

## Task 14: Regenerate OpenAPI spec + frontend types

**Files:**
- Regenerate: `openapi.json`
- Regenerate: `frontend/src/api/schema.ts`

- [ ] **Step 1: Run gen:api**
  ```bash
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' \
  JWT_REFRESH_SECRET='dev-refresh-secret' \
  npm run gen:api
  ```

- [ ] **Step 2: Verify new routes**
  ```bash
  for p in /polls /polls/{id} /polls/{id}/active /public/polls/{slug} /public/polls/{slug}/responses; do
    grep -c "\"$p\"" openapi.json | xargs -I {} echo "$p -> {}"
  done
  ```
  Expected: each prints a non-zero count.

- [ ] **Step 3: Type-check frontend (uses the new schema)**
  ```bash
  npm --workspace frontend run check:ts
  ```
  Expected: clean (no consumers yet — schema is just types).

- [ ] **Step 4: Commit**
  ```bash
  git add openapi.json frontend/src/api/schema.ts
  git commit -m "feat(api): regenerate spec/types for polls + responses"
  ```

---

## Task 15: Frontend primitives — Textarea, Select, ConfirmDialog

**Files (all new under `frontend/src/components/primitives/`):**
- `Textarea.tsx`
- `Select.tsx`
- `ConfirmDialog.tsx`

- [ ] **Step 1: Textarea**
  ```tsx
  import { TextareaHTMLAttributes, forwardRef } from 'react';
  export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function Textarea({ className = '', rows = 4, ...rest }, ref) {
      return (
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`}
          {...rest}
        />
      );
    },
  );
  ```

- [ ] **Step 2: Select**
  ```tsx
  import { SelectHTMLAttributes, forwardRef } from 'react';
  export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
    function Select({ className = '', children, ...rest }, ref) {
      return (
        <select
          ref={ref}
          className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 ${className}`}
          {...rest}
        >
          {children}
        </select>
      );
    },
  );
  ```

- [ ] **Step 3: ConfirmDialog**
  ```tsx
  import { ReactNode } from 'react';
  import { Button } from './Button';

  interface Props {
    title: string;
    body?: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    isPending?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }

  export function ConfirmDialog({ title, body, confirmLabel = 'Delete', danger = true, isPending, onCancel, onConfirm }: Props) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onCancel}
      >
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {body && <div className="mt-2 text-sm text-gray-600">{body}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button variant={danger ? 'danger' : 'primary'} isLoading={isPending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/components/primitives/Textarea.tsx \
    frontend/src/components/primitives/Select.tsx \
    frontend/src/components/primitives/ConfirmDialog.tsx
  git commit -m "feat(frontend): Textarea, Select, ConfirmDialog primitives"
  ```

---

## Task 16: Polls queries + mutations (TanStack Query hooks, typed)

**Files (new):**
- `frontend/src/api/queries/polls.ts`
- `frontend/src/api/mutations/polls.ts`

- [ ] **Step 1: Queries**

  `frontend/src/api/queries/polls.ts`:
  ```ts
  import { useQuery } from '@tanstack/react-query';
  import { apiClient } from '../client';

  export function useMyPolls(args: { page?: number; pageSize?: number } = {}) {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    return useQuery({
      queryKey: ['polls', { page, pageSize }],
      queryFn: async () => {
        const r = await apiClient.GET('/polls', {
          params: { query: { page: String(page), pageSize: String(pageSize) } } as any,
        });
        if (!r.response.ok) throw r.error ?? new Error('Failed to load polls');
        return r.data!;
      },
    });
  }

  export function usePoll(id: string | undefined) {
    return useQuery({
      enabled: !!id,
      queryKey: ['polls', id],
      queryFn: async () => {
        const r = await apiClient.GET('/polls/{id}', { params: { path: { id: id! } } });
        if (!r.response.ok) throw r.error ?? new Error('Failed to load poll');
        return r.data!;
      },
    });
  }
  ```

  (`/polls`'s query params are typed as strings by openapi-typescript; the `as any` here is narrow and tolerated.)

- [ ] **Step 2: Mutations**

  `frontend/src/api/mutations/polls.ts`:
  ```ts
  import { useMutation, useQueryClient } from '@tanstack/react-query';
  import { apiClient } from '../client';
  import type { components } from '../schema';

  type CreatePollBody = components['schemas']['CreatePollDto'];
  type UpdatePollBody = components['schemas']['UpdatePollDto'];

  export function useCreatePoll() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (body: CreatePollBody) => {
        const r = await apiClient.POST('/polls', { body });
        if (!r.response.ok) throw r.error ?? new Error('Create failed');
        return r.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
    });
  }

  export function useUpdatePoll(id: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (body: UpdatePollBody) => {
        const r = await apiClient.PATCH('/polls/{id}', { params: { path: { id } }, body });
        if (!r.response.ok) throw r.error ?? new Error('Update failed');
        return r.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
    });
  }

  export function useDeletePoll() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const r = await apiClient.DELETE('/polls/{id}', { params: { path: { id } } });
        if (!r.response.ok) throw r.error ?? new Error('Delete failed');
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
    });
  }

  export function useToggleActive() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (args: { id: string; isActive: boolean }) => {
        const r = await apiClient.PATCH('/polls/{id}/active', {
          params: { path: { id: args.id } },
          body: { isActive: args.isActive },
        });
        if (!r.response.ok) throw r.error ?? new Error('Toggle failed');
        return r.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
    });
  }
  ```

- [ ] **Step 3: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/api/queries/ frontend/src/api/mutations/
  git commit -m "feat(frontend): polls queries + mutations (typed openapi-fetch)"
  ```

---

## Task 17: Dashboard rewrite — PollListItem + DashboardScreen

**Files:**
- Create: `frontend/src/lib/format-date.ts`
- Create: `frontend/src/lib/copy-to-clipboard.ts`
- Create: `frontend/src/routes/dashboard/PollListItem.tsx`
- Modify: `frontend/src/routes/dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Small utilities**

  `frontend/src/lib/format-date.ts`:
  ```ts
  export function formatDate(iso?: string): string | null {
    if (!iso) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  }
  ```

  `frontend/src/lib/copy-to-clipboard.ts`:
  ```ts
  export async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  ```

- [ ] **Step 2: PollListItem**

  `frontend/src/routes/dashboard/PollListItem.tsx`:
  ```tsx
  import { useNavigate } from 'react-router-dom';
  import { toast } from 'sonner';
  import { Card } from '../../components/primitives/Card';
  import { Badge } from '../../components/primitives/Badge';
  import { Button } from '../../components/primitives/Button';
  import { formatDate } from '../../lib/format-date';
  import { copyToClipboard } from '../../lib/copy-to-clipboard';
  import { useToggleActive } from '../../api/mutations/polls';
  import type { components } from '../../api/schema';

  type Poll = components['schemas']['PollSummaryDto'];

  export function PollListItem({ poll, onDelete }: { poll: Poll; onDelete: (id: string) => void }) {
    const navigate = useNavigate();
    const toggle = useToggleActive();
    const link = `${window.location.origin}/p/${poll.slug}`;

    return (
      <Card size="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{poll.title}</h3>
              <Badge variant={poll.visibility === 'PUBLIC' ? 'success' : 'default'}>{poll.visibility}</Badge>
              <Badge variant={poll.isActive ? 'info' : 'danger'}>{poll.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              /{poll.slug} · {poll.responseCount} response{poll.responseCount === 1 ? '' : 's'}
              {poll.expiresAt && <> · Expires {formatDate(poll.expiresAt)}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggle.mutate({ id: poll.id, isActive: !poll.isActive })}
              isLoading={toggle.isPending}
            >
              {poll.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const ok = await copyToClipboard(link);
                toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link');
              }}
            >
              Copy link
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/polls/${poll.id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(poll.id)}>
              Delete
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  ```

- [ ] **Step 3: DashboardScreen rewrite**

  Replace `frontend/src/routes/dashboard/DashboardScreen.tsx`:
  ```tsx
  import { useState } from 'react';
  import { Link } from 'react-router-dom';
  import { toast } from 'sonner';
  import { useMyPolls } from '../../api/queries/polls';
  import { useDeletePoll } from '../../api/mutations/polls';
  import { Card } from '../../components/primitives/Card';
  import { Button } from '../../components/primitives/Button';
  import { Spinner } from '../../components/primitives/Spinner';
  import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
  import { useAuth } from '../../auth/useAuth';
  import { PollListItem } from './PollListItem';

  export function DashboardScreen() {
    const { user } = useAuth();
    const polls = useMyPolls();
    const del = useDeletePoll();
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    return (
      <section className="max-w-4xl mx-auto py-12 px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Welcome back, {user?.name}.</p>
          </div>
          <Link to="/polls/new"><Button>Create poll</Button></Link>
        </div>

        <div className="mt-8">
          {polls.isLoading ? (
            <div className="flex justify-center py-12"><Spinner size={28} /></div>
          ) : polls.isError ? (
            <Card className="text-center">
              <p className="text-sm text-red-600">Could not load polls.</p>
            </Card>
          ) : !polls.data || polls.data.items.length === 0 ? (
            <Card className="text-center">
              <p className="text-3xl">📋</p>
              <p className="mt-3 text-base font-semibold text-gray-900">No polls yet</p>
              <p className="mt-1 text-sm text-gray-500">Create your first poll to start collecting responses.</p>
              <Link to="/polls/new"><Button className="mt-4">Create poll</Button></Link>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {polls.data.items.map((p) => (
                <PollListItem key={p.id} poll={p} onDelete={setPendingDeleteId} />
              ))}
            </div>
          )}
        </div>

        {pendingDeleteId && (
          <ConfirmDialog
            title="Delete this poll?"
            body="The poll and all its responses will be permanently removed."
            confirmLabel="Delete"
            isPending={del.isPending}
            onCancel={() => setPendingDeleteId(null)}
            onConfirm={() =>
              del.mutate(pendingDeleteId, {
                onSuccess: () => {
                  setPendingDeleteId(null);
                  toast.success('Poll deleted');
                },
                onError: () => toast.error('Could not delete poll'),
              })
            }
          />
        )}
      </section>
    );
  }
  ```

- [ ] **Step 4: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/lib/ frontend/src/routes/dashboard/
  git commit -m "feat(frontend): dashboard with poll list, delete, copy link, toggle active"
  ```

---

## Task 18: Poll form zod schema

**Files:**
- Create: `frontend/src/forms/schemas/poll.schema.ts`

- [ ] **Step 1: Schema**

  ```ts
  import { z } from 'zod';

  export const QuestionType = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT'] as const;
  export const Visibility = ['PUBLIC', 'PRIVATE'] as const;

  const optionSchema = z.object({
    text: z.string().min(1, 'Option text required').max(200, 'Option too long'),
  });

  const questionSchema = z
    .object({
      type: z.enum(QuestionType),
      text: z.string().min(1, 'Question text required').max(500, 'Question too long'),
      isRequired: z.boolean(),
      options: z.array(optionSchema).optional(),
    })
    .refine(
      (q) => q.type === 'TEXT' || (q.options && q.options.length >= 2),
      { message: 'At least 2 options required for choice questions', path: ['options'] },
    );

  export const pollFormSchema = z.object({
    title: z.string().min(1, 'Title required').max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional().or(z.literal('')),
    visibility: z.enum(Visibility),
    isActive: z.boolean(),
    expiresAt: z.string().optional().or(z.literal('')),
    questions: z.array(questionSchema).min(1, 'Add at least one question'),
  });

  export type PollFormValues = z.infer<typeof pollFormSchema>;
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add frontend/src/forms/schemas/poll.schema.ts
  git commit -m "feat(frontend): zod schema for poll create/edit form"
  ```

---

## Task 19: PollFormScreen (create flow) — incl. QuestionEditor + OptionEditor

**Files (new):**
- `frontend/src/routes/polls/OptionEditor.tsx`
- `frontend/src/routes/polls/QuestionEditor.tsx`
- `frontend/src/routes/polls/PollFormScreen.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: OptionEditor (controlled by react-hook-form `useFieldArray`)**

  ```tsx
  import { useFieldArray, useFormContext } from 'react-hook-form';
  import { Input } from '../../components/primitives/Input';
  import { Button } from '../../components/primitives/Button';
  import type { PollFormValues } from '../../forms/schemas/poll.schema';

  export function OptionEditor({ questionIndex }: { questionIndex: number }) {
    const { control, register, formState: { errors } } = useFormContext<PollFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `questions.${questionIndex}.options` as const });

    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-gray-700">Options</p>
        {fields.map((f, oi) => (
          <div key={f.id} className="flex items-center gap-2">
            <Input placeholder={`Option ${oi + 1}`} {...register(`questions.${questionIndex}.options.${oi}.text` as const)} />
            <Button type="button" variant="secondary" size="sm" onClick={() => remove(oi)} disabled={fields.length <= 2}>
              Remove
            </Button>
          </div>
        ))}
        {errors.questions?.[questionIndex]?.options && (
          <p className="text-xs text-red-600">{errors.questions[questionIndex]?.options?.message as string}</p>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ text: '' })}>
          + Add option
        </Button>
      </div>
    );
  }
  ```

- [ ] **Step 2: QuestionEditor**

  ```tsx
  import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
  import { Input } from '../../components/primitives/Input';
  import { Select } from '../../components/primitives/Select';
  import { Button } from '../../components/primitives/Button';
  import { Card } from '../../components/primitives/Card';
  import { Field } from '../../components/primitives/Field';
  import { OptionEditor } from './OptionEditor';
  import type { PollFormValues } from '../../forms/schemas/poll.schema';

  export function QuestionEditor({ index, onRemove, disabled }: { index: number; onRemove: () => void; disabled: boolean }) {
    const { register, control, formState: { errors }, setValue } = useFormContext<PollFormValues>();
    const type = useWatch({ control, name: `questions.${index}.type` });
    const optionsFA = useFieldArray({ control, name: `questions.${index}.options` as const });

    // When switching to/from TEXT, manage the options array.
    function changeType(t: PollFormValues['questions'][number]['type']) {
      setValue(`questions.${index}.type`, t);
      if (t === 'TEXT') {
        setValue(`questions.${index}.options`, undefined);
      } else if (!optionsFA.fields.length) {
        setValue(`questions.${index}.options`, [{ text: '' }, { text: '' }]);
      }
    }

    return (
      <Card size="sm" className="border-l-4 border-l-indigo-600">
        <fieldset disabled={disabled} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">Question {index + 1}</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRemove}>Remove</Button>
          </div>

          <Field label="Type">
            <Select value={type} onChange={(e) => changeType(e.target.value as any)}>
              <option value="SINGLE_CHOICE">Single choice</option>
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="TEXT">Free text</option>
            </Select>
          </Field>

          <Field label="Question text" error={errors.questions?.[index]?.text?.message}>
            <Input placeholder="What's your question?" {...register(`questions.${index}.text` as const)} />
          </Field>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="accent-indigo-600" {...register(`questions.${index}.isRequired` as const)} />
            Required
          </label>

          {type !== 'TEXT' && <OptionEditor questionIndex={index} />}
        </fieldset>
      </Card>
    );
  }
  ```

- [ ] **Step 3: PollFormScreen (create mode)**

  ```tsx
  import { useState } from 'react';
  import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { Link, useNavigate } from 'react-router-dom';
  import { toast } from 'sonner';
  import { pollFormSchema, type PollFormValues } from '../../forms/schemas/poll.schema';
  import { Input } from '../../components/primitives/Input';
  import { Textarea } from '../../components/primitives/Textarea';
  import { Select } from '../../components/primitives/Select';
  import { Button } from '../../components/primitives/Button';
  import { Field } from '../../components/primitives/Field';
  import { Card } from '../../components/primitives/Card';
  import { QuestionEditor } from './QuestionEditor';
  import { useCreatePoll } from '../../api/mutations/polls';

  const defaultQuestion: PollFormValues['questions'][number] = {
    type: 'SINGLE_CHOICE',
    text: '',
    isRequired: false,
    options: [{ text: '' }, { text: '' }],
  };

  export function PollFormScreen() {
    const navigate = useNavigate();
    const create = useCreatePoll();
    const methods = useForm<PollFormValues>({
      resolver: zodResolver(pollFormSchema),
      defaultValues: {
        title: '',
        description: '',
        visibility: 'PRIVATE',
        isActive: true,
        expiresAt: '',
        questions: [defaultQuestion],
      },
    });
    const { register, handleSubmit, formState: { errors }, control } = methods;
    const qFA = useFieldArray({ control, name: 'questions' });
    const [serverError, setServerError] = useState<string | null>(null);

    const onSubmit = handleSubmit(async (values) => {
      setServerError(null);
      try {
        await create.mutateAsync({
          title: values.title,
          description: values.description || undefined,
          visibility: values.visibility,
          isActive: values.isActive,
          expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
          questions: values.questions.map((q) => ({
            type: q.type,
            text: q.text,
            isRequired: q.isRequired,
            options: q.type === 'TEXT' ? undefined : q.options,
          })),
        });
        toast.success('Poll created');
        navigate('/dashboard');
      } catch (err: any) {
        setServerError(err?.message ?? 'Could not create poll');
        toast.error('Could not create poll');
      }
    });

    return (
      <section className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">New poll</h1>
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <Card>
              <div className="flex flex-col gap-4">
                <Field label="Title" error={errors.title?.message}>
                  <Input {...register('title')} placeholder="e.g. Lunch options" />
                </Field>
                <Field label="Description" error={errors.description?.message}>
                  <Textarea {...register('description')} placeholder="Optional context for respondents" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Visibility">
                    <Select {...register('visibility')}>
                      <option value="PRIVATE">Private (link only)</option>
                      <option value="PUBLIC">Public</option>
                    </Select>
                  </Field>
                  <Field label="Expires at (optional)" error={errors.expiresAt?.message}>
                    <Input type="datetime-local" {...register('expiresAt')} />
                  </Field>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="accent-indigo-600" {...register('isActive')} />
                  Active (accepting responses)
                </label>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              {qFA.fields.map((f, i) => (
                <QuestionEditor key={f.id} index={i} disabled={false} onRemove={() => qFA.remove(i)} />
              ))}
            </div>

            <Button type="button" variant="secondary" onClick={() => qFA.append({ ...defaultQuestion })}>
              + Add question
            </Button>

            {errors.questions && typeof errors.questions.message === 'string' && (
              <p className="text-sm text-red-600">{errors.questions.message}</p>
            )}
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <div className="flex justify-end gap-3">
              <Link to="/dashboard"><Button variant="secondary" type="button">Cancel</Button></Link>
              <Button type="submit" isLoading={create.isPending}>Create poll</Button>
            </div>
          </form>
        </FormProvider>
      </section>
    );
  }
  ```

- [ ] **Step 4: Router — add `/polls/new`**

  In `frontend/src/router.tsx`, add to the children array (wrapped in `RequireAuth`):
  ```tsx
  { path: '/polls/new', element: <RequireAuth><PollFormScreen /></RequireAuth> },
  ```
  And add the import: `import { PollFormScreen } from './routes/polls/PollFormScreen';`

- [ ] **Step 5: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/routes/polls/ frontend/src/router.tsx
  git commit -m "feat(frontend): poll form (create) with question/option editors"
  ```

---

## Task 20: PollFormScreen — edit mode with locked-state banner

**Files:**
- Modify: `frontend/src/routes/polls/PollFormScreen.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Edit mode support**

  Refactor `PollFormScreen` so it can hydrate from `usePoll(id)` when an `id` URL param is present. Key changes:

  - Read `id` via `useParams<{ id: string }>()`.
  - When `id` exists, call `usePoll(id)`.
  - Once loaded, pre-fill the form via `reset()` from `react-hook-form` with the server values.
  - Replace `useCreatePoll` with `useUpdatePoll(id!)` in edit mode (use a conditional hook is not possible — call both, then choose at submit).
  - Show a banner above the form when `poll?.responseCount > 0`:
    ```tsx
    {poll && poll.responseCount > 0 && (
      <Card className="bg-amber-50 border-amber-200 text-amber-900">
        <p className="text-sm">
          🔒 This poll has {poll.responseCount} response{poll.responseCount === 1 ? '' : 's'}.
          Title, description, expires-at, visibility, and active toggle can still change.
          Questions and options are locked.
        </p>
      </Card>
    )}
    ```
  - Pass `disabled={lockedStructure}` to each `<QuestionEditor>` and disable the "+ Add question" / "Remove" buttons when locked.
  - Replace the heading "New poll" with "Edit poll" + the title.

  Here's the full replacement file:

  ```tsx
  import { useEffect, useMemo, useState } from 'react';
  import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { Link, useNavigate, useParams } from 'react-router-dom';
  import { toast } from 'sonner';
  import { pollFormSchema, type PollFormValues } from '../../forms/schemas/poll.schema';
  import { Input } from '../../components/primitives/Input';
  import { Textarea } from '../../components/primitives/Textarea';
  import { Select } from '../../components/primitives/Select';
  import { Button } from '../../components/primitives/Button';
  import { Field } from '../../components/primitives/Field';
  import { Card } from '../../components/primitives/Card';
  import { Spinner } from '../../components/primitives/Spinner';
  import { QuestionEditor } from './QuestionEditor';
  import { useCreatePoll, useUpdatePoll } from '../../api/mutations/polls';
  import { usePoll } from '../../api/queries/polls';

  const defaultQuestion: PollFormValues['questions'][number] = {
    type: 'SINGLE_CHOICE',
    text: '',
    isRequired: false,
    options: [{ text: '' }, { text: '' }],
  };

  export function PollFormScreen() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

    const pollQuery = usePoll(id);
    const poll = pollQuery.data;
    const locked = isEdit && (poll?.responseCount ?? 0) > 0;

    const create = useCreatePoll();
    const update = useUpdatePoll(id ?? '');

    const methods = useForm<PollFormValues>({
      resolver: zodResolver(pollFormSchema),
      defaultValues: {
        title: '',
        description: '',
        visibility: 'PRIVATE',
        isActive: true,
        expiresAt: '',
        questions: [defaultQuestion],
      },
    });
    const { register, handleSubmit, formState: { errors }, control, reset } = methods;
    const qFA = useFieldArray({ control, name: 'questions' });

    useEffect(() => {
      if (!isEdit || !poll) return;
      reset({
        title: poll.title,
        description: poll.description ?? '',
        visibility: poll.visibility,
        isActive: poll.isActive,
        expiresAt: poll.expiresAt ? toLocalInputValue(poll.expiresAt) : '',
        questions: poll.questions.map((q) => ({
          type: q.type as PollFormValues['questions'][number]['type'],
          text: q.text,
          isRequired: q.isRequired,
          options: q.type === 'TEXT' ? undefined : q.options.map((o) => ({ text: o.text })),
        })),
      });
    }, [isEdit, poll, reset]);

    const [serverError, setServerError] = useState<string | null>(null);

    const onSubmit = handleSubmit(async (values) => {
      setServerError(null);
      const payload = {
        title: values.title,
        description: values.description || undefined,
        visibility: values.visibility,
        isActive: values.isActive,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
        questions: values.questions.map((q) => ({
          type: q.type,
          text: q.text,
          isRequired: q.isRequired,
          options: q.type === 'TEXT' ? undefined : q.options,
        })),
      };
      try {
        if (isEdit) {
          await update.mutateAsync(payload as any);
          toast.success('Poll updated');
        } else {
          await create.mutateAsync(payload as any);
          toast.success('Poll created');
        }
        navigate('/dashboard');
      } catch (err: any) {
        setServerError(err?.message ?? 'Could not save poll');
        toast.error('Could not save poll');
      }
    });

    const heading = useMemo(() => (isEdit ? `Edit "${poll?.title ?? '…'}"` : 'New poll'), [isEdit, poll?.title]);

    if (isEdit && pollQuery.isLoading) {
      return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
    }

    return (
      <section className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
        </div>

        {locked && (
          <Card className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
            <p className="text-sm">
              🔒 This poll has {poll!.responseCount} response{poll!.responseCount === 1 ? '' : 's'}.
              Title, description, expires-at, visibility, and active toggle can still change.
              Questions and options are locked.
            </p>
          </Card>
        )}

        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <Card>
              <div className="flex flex-col gap-4">
                <Field label="Title" error={errors.title?.message}>
                  <Input {...register('title')} placeholder="e.g. Lunch options" />
                </Field>
                <Field label="Description" error={errors.description?.message}>
                  <Textarea {...register('description')} placeholder="Optional context for respondents" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Visibility">
                    <Select {...register('visibility')}>
                      <option value="PRIVATE">Private (link only)</option>
                      <option value="PUBLIC">Public</option>
                    </Select>
                  </Field>
                  <Field label="Expires at (optional)" error={errors.expiresAt?.message}>
                    <Input type="datetime-local" {...register('expiresAt')} />
                  </Field>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="accent-indigo-600" {...register('isActive')} />
                  Active (accepting responses)
                </label>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              {qFA.fields.map((f, i) => (
                <QuestionEditor key={f.id} index={i} disabled={locked} onRemove={() => qFA.remove(i)} />
              ))}
            </div>

            {!locked && (
              <Button type="button" variant="secondary" onClick={() => qFA.append({ ...defaultQuestion })}>
                + Add question
              </Button>
            )}

            {errors.questions && typeof errors.questions.message === 'string' && (
              <p className="text-sm text-red-600">{errors.questions.message}</p>
            )}
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <div className="flex justify-end gap-3">
              <Link to="/dashboard"><Button variant="secondary" type="button">Cancel</Button></Link>
              <Button type="submit" isLoading={create.isPending || update.isPending}>
                {isEdit ? 'Save changes' : 'Create poll'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </section>
    );
  }

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  ```

- [ ] **Step 2: Router — add `/polls/:id/edit`**

  In `frontend/src/router.tsx`:
  ```tsx
  { path: '/polls/:id/edit', element: <RequireAuth><PollFormScreen /></RequireAuth> },
  ```

- [ ] **Step 3: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/routes/polls/PollFormScreen.tsx frontend/src/router.tsx
  git commit -m "feat(frontend): poll form supports edit mode + locked-state banner"
  ```

---

## Task 21: Public poll — QuestionRenderer + PollScreen

**Files (new):**
- `frontend/src/routes/poll/QuestionRenderer.tsx`
- `frontend/src/routes/poll/PollScreen.tsx`
- `frontend/src/api/queries/public-polls.ts`
- `frontend/src/api/mutations/responses.ts`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Public queries + mutations**

  `frontend/src/api/queries/public-polls.ts`:
  ```ts
  import { useQuery } from '@tanstack/react-query';
  import { apiClient } from '../client';

  export function usePublicPoll(slug: string | undefined) {
    return useQuery({
      enabled: !!slug,
      queryKey: ['public-poll', slug],
      queryFn: async () => {
        const r = await apiClient.GET('/public/polls/{slug}', { params: { path: { slug: slug! } } });
        if (!r.response.ok) throw r.error ?? new Error('Not found');
        return r.data!;
      },
    });
  }
  ```

  `frontend/src/api/mutations/responses.ts`:
  ```ts
  import { useMutation } from '@tanstack/react-query';
  import { apiClient } from '../client';
  import type { components } from '../schema';

  type SubmitBody = components['schemas']['SubmitResponseDto'];

  export function useSubmitResponse(slug: string) {
    return useMutation({
      mutationFn: async (body: SubmitBody) => {
        const r = await apiClient.POST('/public/polls/{slug}/responses', {
          params: { path: { slug } },
          body,
        });
        if (!r.response.ok) {
          const code = (r.error as any)?.code;
          throw Object.assign(new Error('Submit failed'), { code });
        }
        return r.data!;
      },
    });
  }
  ```

- [ ] **Step 2: QuestionRenderer**

  ```tsx
  import type { components } from '../../api/schema';
  import { Input } from '../../components/primitives/Input';
  import { Textarea } from '../../components/primitives/Textarea';

  type Question = components['schemas']['QuestionDto'];
  type Value = string | string[] | undefined;

  export function QuestionRenderer({
    question, value, onChange, error,
  }: { question: Question; value: Value; onChange: (v: Value) => void; error?: string }) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-900">
          {question.text}{question.isRequired && <span className="ml-1 text-red-600">*</span>}
        </p>

        {question.type === 'SINGLE_CHOICE' && (
          <div className="flex flex-col gap-2">
            {question.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="accent-indigo-600 h-4 w-4"
                  checked={value === o.id}
                  onChange={() => onChange(o.id)}
                />
                {o.text}
              </label>
            ))}
          </div>
        )}

        {question.type === 'MULTIPLE_CHOICE' && (
          <div className="flex flex-col gap-2">
            {question.options.map((o) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(o.id);
              return (
                <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-indigo-600 h-4 w-4"
                    checked={checked}
                    onChange={() => onChange(checked ? arr.filter((v) => v !== o.id) : [...arr, o.id])}
                  />
                  {o.text}
                </label>
              );
            })}
          </div>
        )}

        {question.type === 'TEXT' && (
          <Textarea
            rows={3}
            placeholder="Your answer…"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  ```

- [ ] **Step 3: PollScreen (public)**

  ```tsx
  import { useState } from 'react';
  import { useParams } from 'react-router-dom';
  import { toast } from 'sonner';
  import { Card } from '../../components/primitives/Card';
  import { Button } from '../../components/primitives/Button';
  import { Spinner } from '../../components/primitives/Spinner';
  import { usePublicPoll } from '../../api/queries/public-polls';
  import { useSubmitResponse } from '../../api/mutations/responses';
  import { QuestionRenderer } from './QuestionRenderer';

  export function PollScreen() {
    const { slug } = useParams<{ slug: string }>();
    const q = usePublicPoll(slug);
    const submit = useSubmitResponse(slug ?? '');
    const [values, setValues] = useState<Record<string, string | string[] | undefined>>({});
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (q.isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
    if (q.isError || !q.data) {
      return (
        <Card className="max-w-md mx-auto mt-16 text-center">
          <p className="text-base font-semibold text-gray-900">Poll not found</p>
        </Card>
      );
    }

    const poll = q.data;

    if (poll.closed) {
      return (
        <Card className="max-w-md mx-auto mt-16 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-3 text-base font-semibold text-gray-900">This poll has closed</p>
          <p className="mt-1 text-sm text-gray-500">No new responses are being accepted.</p>
        </Card>
      );
    }

    if (submitted) {
      return (
        <Card className="max-w-md mx-auto mt-16 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-3 text-base font-semibold text-gray-900">Thank you!</p>
          <p className="mt-1 text-sm text-gray-500">Your response has been recorded.</p>
        </Card>
      );
    }

    function validate(): boolean {
      const next: Record<string, string> = {};
      for (const q of poll.questions) {
        const v = values[q.id];
        if (q.type === 'TEXT') {
          if (q.isRequired && !(typeof v === 'string' && v.trim())) next[q.id] = 'This answer is required';
        } else if (q.type === 'SINGLE_CHOICE') {
          if (q.isRequired && !v) next[q.id] = 'Pick an option';
        } else {
          if (q.isRequired && (!Array.isArray(v) || v.length === 0)) next[q.id] = 'Pick at least one option';
        }
      }
      setErrors(next);
      return Object.keys(next).length === 0;
    }

    async function onSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!validate()) return;
      try {
        await submit.mutateAsync({
          answers: poll.questions.map((q) => {
            const v = values[q.id];
            if (q.type === 'TEXT') return { questionId: q.id, textValue: (v as string) ?? '' };
            if (q.type === 'SINGLE_CHOICE') return { questionId: q.id, optionIds: v ? [v as string] : [] };
            return { questionId: q.id, optionIds: (v as string[]) ?? [] };
          }),
        });
        setSubmitted(true);
      } catch (err: any) {
        if (err?.code === 'ALREADY_RESPONDED') toast.error('You have already answered this poll.');
        else if (err?.code === 'POLL_CLOSED') toast.error('This poll just closed.');
        else toast.error('Could not submit your response.');
      }
    }

    return (
      <section className="max-w-xl mx-auto py-12 px-6">
        <Card>
          <h1 className="text-2xl font-bold text-gray-900">{poll.title}</h1>
          {poll.description && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{poll.description}</p>}
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
            {poll.questions.map((qn) => (
              <QuestionRenderer
                key={qn.id}
                question={qn}
                value={values[qn.id]}
                onChange={(v) => setValues((p) => ({ ...p, [qn.id]: v }))}
                error={errors[qn.id]}
              />
            ))}
            <Button type="submit" isLoading={submit.isPending} className="w-full">
              Submit response
            </Button>
          </form>
        </Card>
      </section>
    );
  }
  ```

- [ ] **Step 4: Router — add `/p/:slug`**

  In `frontend/src/router.tsx`, replace the (currently-missing) public poll route. Place this entry as one of the top-level children (NOT wrapped in `RequireAuth`):
  ```tsx
  { path: '/p/:slug', element: <PollScreen /> },
  ```
  Add `import { PollScreen } from './routes/poll/PollScreen';`.

- [ ] **Step 5: Type-check + commit**
  ```bash
  npm --workspace frontend run check:ts
  git add frontend/src/api/queries/public-polls.ts frontend/src/api/mutations/responses.ts \
    frontend/src/routes/poll/ frontend/src/router.tsx
  git commit -m "feat(frontend): public poll page with QuestionRenderer + submit flow"
  ```

---

## Task 22: PollFormScreen test — locked banner + question type switching

**Files:**
- Create: `frontend/src/routes/polls/__tests__/PollFormScreen.test.tsx`

- [ ] **Step 1: Add a test that mounts the form in edit mode with a poll that has responses, asserts the banner is visible, and asserts the "+ Add question" button is hidden. Then a second test that switches a question's type from SINGLE_CHOICE to TEXT and asserts the options panel disappears.

  ```tsx
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { MemoryRouter, Route, Routes } from 'react-router-dom';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  vi.mock('../../../api/queries/polls', () => ({
    usePoll: (id?: string) => ({
      data: id ? {
        id, slug: 'abc', title: 'X', description: '', visibility: 'PRIVATE',
        isActive: true, expiresAt: undefined, responseCount: 3, createdAt: '2026-01-01T00:00:00Z',
        questions: [
          { id: 'q1', order: 0, type: 'SINGLE_CHOICE', text: 'Pick', isRequired: true,
            options: [{ id: 'o1', order: 0, text: 'A' }, { id: 'o2', order: 1, text: 'B' }] },
        ],
      } : undefined,
      isLoading: false, isError: false,
    }),
  }));

  vi.mock('../../../api/mutations/polls', () => ({
    useCreatePoll: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdatePoll: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }));

  // After the mocks:
  import { PollFormScreen } from '../PollFormScreen';

  function renderAt(path: string) {
    const qc = new QueryClient();
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/polls/:id/edit" element={<PollFormScreen />} />
            <Route path="/polls/new" element={<PollFormScreen />} />
            <Route path="/dashboard" element={<div>dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('shows the locked banner when the poll has responses', () => {
    renderAt('/polls/p1/edit');
    expect(screen.getByText(/This poll has 3 responses/)).toBeInTheDocument();
    expect(screen.queryByText('+ Add question')).not.toBeInTheDocument();
  });

  it('switching a question to TEXT hides the options panel', async () => {
    renderAt('/polls/new');
    expect(screen.getByText('Options')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[1], 'TEXT');
    expect(screen.queryByText('Options')).not.toBeInTheDocument();
  });
  ```

- [ ] **Step 2: Run + commit**
  ```bash
  npm --workspace frontend test -- PollFormScreen
  git add frontend/src/routes/polls/__tests__/
  git commit -m "test(frontend): PollFormScreen locked banner + type switch"
  ```

---

## Task 23: PollScreen + QuestionRenderer tests

**Files:**
- Create: `frontend/src/routes/poll/__tests__/QuestionRenderer.test.tsx`

- [ ] **Step 1: Tests for each question type**

  ```tsx
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { QuestionRenderer } from '../QuestionRenderer';

  const single = {
    id: 'q1', order: 0, type: 'SINGLE_CHOICE' as const, text: 'Pick', isRequired: true,
    options: [{ id: 'a', order: 0, text: 'A' }, { id: 'b', order: 1, text: 'B' }],
  };

  it('SINGLE_CHOICE: selecting a radio reports the option id', async () => {
    const onChange = vi.fn();
    render(<QuestionRenderer question={single} value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('A'));
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  const multi = { ...single, id: 'q2', type: 'MULTIPLE_CHOICE' as const };

  it('MULTIPLE_CHOICE: toggling boxes accumulates ids', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuestionRenderer question={multi} value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('A'));
    expect(onChange).toHaveBeenCalledWith(['a']);
    rerender(<QuestionRenderer question={multi} value={['a']} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('B'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  const text = { id: 'q3', order: 0, type: 'TEXT' as const, text: 'Why?', isRequired: false, options: [] };

  it('TEXT: typing reports the value', async () => {
    const onChange = vi.fn();
    render(<QuestionRenderer question={text} value={''} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText('Your answer…'), 'hi');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('hi');
  });
  ```

- [ ] **Step 2: Run + commit**
  ```bash
  npm --workspace frontend test -- QuestionRenderer
  git add frontend/src/routes/poll/__tests__/
  git commit -m "test(frontend): QuestionRenderer across all three types"
  ```

---

## Task 24: Final end-to-end smoke against the live compose stack

- [ ] **Step 1: Make sure compose is running (or restart it)**
  ```bash
  docker compose ps 2>/dev/null || docker-compose ps
  # If down:
  docker compose up -d --build 2>/dev/null || docker-compose up -d --build
  sleep 10
  ```

- [ ] **Step 2: End-to-end via the frontend proxy**

  Manual (open in a browser):
  1. `http://localhost:5173/login` → log in as `admin@polls.local` / `admin`.
  2. Land on `/dashboard` → "No polls yet" → click "Create poll".
  3. Fill: title `Smoke poll`, visibility `Public`, add 3 questions (SINGLE / MULTI / TEXT), save.
  4. Dashboard shows the new poll; click "Copy link".
  5. Open the copied link in an incognito window → poll page loads → submit answers → "Thank you!".
  6. Try to submit again in the same incognito window (refresh page → submit) → blocked with toast "You have already answered this poll."
  7. Back in the owner window → edit the poll → see the locked banner ("1 response") → confirm only metadata fields are editable.
  8. Owner deactivates the poll → public link now shows "This poll has closed."
  9. Owner deletes the poll → it disappears from the dashboard; public link now shows "Poll not found."

  Capture any UX issues; small polish commits are OK before the final commit.

- [ ] **Step 3: Regenerate gen:api (in case the schema drifted during dev) and confirm `git diff` is empty**
  ```bash
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' \
  JWT_REFRESH_SECRET='dev-refresh-secret' \
  npm run gen:api
  git diff --exit-code openapi.json frontend/src/api/schema.ts
  ```
  Expected: empty diff. If not, commit the regen as a follow-up.

- [ ] **Step 4: README update**

  Add a "Plan 2 surface" note to `README.md`:
  - User dashboard supports create/edit/delete polls and toggle active.
  - Public poll page at `/p/:slug`.
  - Cookie dedup per poll; closed/expired show read-only.

  Commit:
  ```bash
  git add README.md
  git commit -m "docs: note plan 2 surface (polls + public responses)"
  ```

---

## Definition of done (Plan 2)

- [ ] `docker compose up --build` brings up the stack; logged-in users can create, edit, toggle, copy-link, and delete polls; anonymous browsers can answer once per poll; the public page shows "closed" when `isActive=false` or `expiresAt < now()`.
- [ ] All backend unit specs pass (`auth.service`, `tokens.service`, `polls.service`, `responses.service`, `slug.service`, `http-exception.filter`).
- [ ] All backend e2e specs pass (auth, polls, responses).
- [ ] All frontend tests pass (`Button`, `RequireAuth`, `refresh-middleware`, `QuestionRenderer`, `PollFormScreen`).
- [ ] `npm run check:ts` clean on both workspaces.
- [ ] `npm run gen:api && git diff --exit-code` — committed spec matches generator output.

Plan 3 (Analytics + Admin) starts from this state.
