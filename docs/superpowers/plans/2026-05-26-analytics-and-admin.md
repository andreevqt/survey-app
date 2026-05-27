# Analytics + Admin Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the final v1 surface — owners get per-poll analytics (total responses + per-question breakdowns), admins get a dark-themed `AdminLayout` with two pages (Users management with role change, bulk delete, and CSV export; System Analytics with system-wide aggregates), role changes force the affected user to re-login, and the whole flow is covered by Playwright e2e.

**Architecture:** Two new backend modules (`analytics`, `users`) added to NestJS — `analytics` exposes owner-scoped per-poll endpoints and admin-only system aggregates; `users` exposes admin-only list/role-change/bulk-delete/CSV-export endpoints. `AdminRoleGuard` (built in this plan) gates every admin endpoint. `users.changeRole` deletes the target user's `RefreshToken` rows so they must re-login with the new role. Frontend gains an `AdminLayout` with a dark sidebar (built from `design/AdminScreens.jsx`), two admin routes (`/admin/users`, `/admin/analytics`), and one owner route (`/polls/:id/analytics`); the existing `Header` gets an "Admin Panel" link visible to `ADMIN` role. Charts are simple per-question bars matching the design — no Recharts timeline (spec §1 non-goals).

**Spec reference:** `docs/superpowers/specs/2026-05-26-survey-app-design.md` — Sections 1, 5 (admin endpoints), 6 (role-change session invalidation), 7 (frontend routing/admin layout), 10 (testing — Playwright flows), 11 (defaulted decisions — CSV columns, pagination, etc.), Appendix B (error codes), Appendix C (design mapping for admin shell, users table, analytics view).

**Previous plans:** Plan 1 (foundation + auth) → Plan 2 (polls + public responses) → **Plan 3 (this one)**.

**Tech stack additions over Plans 1-2:** `@playwright/test` for e2e flows. No other new deps; everything else already installed.

**Defaulted decisions (flag any to revise before kickoff):**
- Bulk delete protections: an admin cannot delete themselves; the request errors if it would leave zero admins in the system.
- CSV export: `Content-Type: text/csv; charset=utf-8`, UTF-8 BOM prefix, `Content-Disposition: attachment; filename="users.csv"`, columns `id, name, email, role, createdAt`, streamed.
- Role change endpoint: `PATCH /admin/users/:id/role` with body `{ role: 'ADMIN' | 'USER' }`. Always invalidates that user's `RefreshToken` rows (no-op when role is unchanged is still a 200).
- Bulk delete endpoint: `POST /admin/users/bulk-delete` with body `{ ids: string[] }`, returns `{ count: number }`.
- "Admin Panel" entry from `MainLayout.Header`: visible only when `user.role === 'ADMIN'`; navigates to `/admin/users` (the first admin route).
- Admin sidebar "Dashboard" link routes back to `/dashboard` (leaves the admin shell — matches the design's intent that there is one personal dashboard for everyone).
- Playwright e2e: two flows — full lifecycle (register → create → logout → submit → login → see in owner analytics) and admin role flow (admin promotes a user → that user logs in and sees the Admin Panel button → admin bulk-deletes another user → CSV reflects the deletion).

---

## File Structure

```
backend/src/
├── analytics/
│   ├── analytics.module.ts                              # T04
│   ├── analytics.controller.ts                          # T04
│   ├── analytics.service.ts                             # T02, T03
│   ├── analytics.service.spec.ts                        # T02, T03
│   └── dto/
│       ├── owner-analytics.dto.ts                       # T01
│       └── system-analytics.dto.ts                      # T01
├── users/
│   ├── users.module.ts                                  # T11
│   ├── users.controller.ts                              # T11
│   ├── users.service.ts                                 # T07, T08, T09, T10
│   ├── users.service.spec.ts                            # T07, T08, T09, T10
│   └── dto/
│       ├── list-users-query.dto.ts                      # T06
│       ├── user-summary.dto.ts                          # T06
│       ├── user-list-response.dto.ts                    # T06
│       ├── change-role.dto.ts                           # T06
│       └── bulk-delete.dto.ts                           # T06
├── common/guards/
│   └── admin-role.guard.ts                              # T05
└── app.module.ts                                        # MODIFY in T04 + T11

backend/test/
├── analytics.e2e-spec.ts                                # T12
└── admin.e2e-spec.ts                                    # T12

openapi.json                                             # REGENERATED in T13
frontend/src/api/schema.ts                               # REGENERATED in T13

frontend/src/
├── api/
│   ├── queries/
│   │   ├── analytics.ts                                 # T14
│   │   └── admin.ts                                     # T15
│   └── mutations/
│       └── admin.ts                                     # T15
├── components/analytics/
│   ├── AnalyticsView.tsx                                # T16
│   └── QuestionAnalyticsCard.tsx                        # T16
├── layouts/AdminLayout/
│   ├── AdminLayout.tsx                                  # T17
│   ├── AdminSidebar.tsx                                 # T17
│   └── AdminHeader.tsx                                  # T17
├── routes/
│   ├── polls/analytics/
│   │   └── OwnerAnalyticsScreen.tsx                     # T18
│   └── admin/
│       ├── users/
│       │   ├── UsersScreen.tsx                          # T19
│       │   └── UsersTable.tsx                           # T19
│       └── analytics/
│           └── SystemAnalyticsScreen.tsx                # T20
├── lib/
│   └── download-csv.ts                                  # T19
├── layouts/MainLayout/Header.tsx                        # MODIFY in T21
└── router.tsx                                           # MODIFY in T18, T19, T20

frontend/
├── playwright.config.ts                                 # T22
├── e2e/
│   ├── auth-and-polls.spec.ts                           # T22
│   └── admin.spec.ts                                    # T22
└── package.json                                         # MODIFY in T22 — playwright install
```

---

## Conventions

- Every step ends with a commit. Conventional commits.
- Run commands from the repo root unless noted.
- TDD where the task says "TDD".
- For e2e tasks, the stack must be running (`docker-compose up -d --build`). Playwright uses real network calls against the live stack.

---

## Task 1: Analytics DTOs

**Files (new under `backend/src/analytics/dto/`):**
- `owner-analytics.dto.ts`
- `system-analytics.dto.ts`

- [ ] **Step 1: `owner-analytics.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class OptionAggregateDto {
  @ApiProperty() optionId!: string;
  @ApiProperty() text!: string;
  @ApiProperty() order!: number;
  @ApiProperty() count!: number;
}

export class QuestionAggregateDto {
  @ApiProperty() questionId!: string;
  @ApiProperty() text!: string;
  @ApiProperty() order!: number;
  @ApiProperty({ enum: QuestionType }) type!: QuestionType;
  @ApiProperty() answerCount!: number;
  @ApiProperty({ type: [OptionAggregateDto] }) options!: OptionAggregateDto[];
  @ApiProperty({ description: 'Number of distinct text answers, for TEXT questions only', required: false }) textAnswerCount?: number;
}

export class OwnerAnalyticsDto {
  @ApiProperty() pollId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() totalResponses!: number;
  @ApiProperty({ type: [QuestionAggregateDto] }) questions!: QuestionAggregateDto[];
}
```

- [ ] **Step 2: `system-analytics.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class SystemAnalyticsDto {
  @ApiProperty() totalUsers!: number;
  @ApiProperty() totalAdmins!: number;
  @ApiProperty() totalPolls!: number;
  @ApiProperty() activePolls!: number;
  @ApiProperty() totalResponses!: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/dto/
git commit -m "feat(backend): analytics DTOs (owner + system)"
```

---

## Task 2: AnalyticsService.getOwnerAnalytics (TDD)

**Files:**
- Create: `backend/src/analytics/analytics.service.ts`
- Create: `backend/src/analytics/analytics.service.spec.ts`

- [ ] **Step 1: Write failing tests**

`backend/src/analytics/analytics.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { QuestionType } from '@prisma/client';

describe('AnalyticsService.getOwnerAnalytics', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);
  });

  function pollFixture() {
    return {
      id: 'p1', title: 'T', ownerId: 'u1',
      _count: { responses: 5 },
      questions: [
        {
          id: 'q1', order: 0, text: 'Pick', type: QuestionType.SINGLE_CHOICE,
          options: [
            { id: 'o1', order: 0, text: 'A' },
            { id: 'o2', order: 1, text: 'B' },
          ],
          _count: { answers: 5 },
        },
        {
          id: 'q2', order: 1, text: 'Why?', type: QuestionType.TEXT,
          options: [],
          _count: { answers: 3 },
        },
      ],
    } as any;
  }

  it('returns total responses and per-question option counts', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(pollFixture());
    prisma.answerOption.groupBy.mockResolvedValueOnce([
      { optionId: 'o1', _count: { optionId: 3 } },
      { optionId: 'o2', _count: { optionId: 2 } },
    ] as any);

    const r = await svc.getOwnerAnalytics('u1', 'p1');
    expect(r.pollId).toBe('p1');
    expect(r.totalResponses).toBe(5);
    expect(r.questions).toHaveLength(2);

    const q1 = r.questions[0];
    expect(q1.options.find((o) => o.optionId === 'o1')!.count).toBe(3);
    expect(q1.options.find((o) => o.optionId === 'o2')!.count).toBe(2);

    const q2 = r.questions[1];
    expect(q2.type).toBe(QuestionType.TEXT);
    expect(q2.textAnswerCount).toBe(3);
    expect(q2.options).toEqual([]);
  });

  it('returns zero counts for options that received no votes', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(pollFixture());
    prisma.answerOption.groupBy.mockResolvedValueOnce([
      { optionId: 'o1', _count: { optionId: 5 } },
    ] as any);

    const r = await svc.getOwnerAnalytics('u1', 'p1');
    expect(r.questions[0].options.find((o) => o.optionId === 'o2')!.count).toBe(0);
  });

  it('throws NOT_FOUND when poll is not owned by the user', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(null);
    await expect(svc.getOwnerAnalytics('u1', 'p1')).rejects.toThrow(/NOT_FOUND|Not Found/);
  });
});
```

- [ ] **Step 2: Run — FAIL**
```bash
npm --workspace backend test -- --testPathPattern=analytics.service
```

- [ ] **Step 3: Implement**

`backend/src/analytics/analytics.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerAnalytics(ownerId: string, pollId: string): Promise<OwnerAnalyticsDto> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            _count: { select: { answers: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const optionIds = poll.questions.flatMap((q: any) => q.options.map((o: any) => o.id));
    const optionCounts = optionIds.length
      ? await this.prisma.answerOption.groupBy({
          by: ['optionId'],
          where: { optionId: { in: optionIds } },
          _count: { optionId: true },
        })
      : [];
    const countByOption = new Map<string, number>();
    for (const row of optionCounts as any[]) {
      countByOption.set(row.optionId, row._count.optionId);
    }

    return {
      pollId: poll.id,
      title: poll.title,
      totalResponses: (poll as any)._count.responses,
      questions: poll.questions.map((q: any) => ({
        questionId: q.id,
        text: q.text,
        order: q.order,
        type: q.type,
        answerCount: q._count.answers,
        options: q.options.map((o: any) => ({
          optionId: o.id,
          text: o.text,
          order: o.order,
          count: countByOption.get(o.id) ?? 0,
        })),
        ...(q.type === QuestionType.TEXT ? { textAnswerCount: q._count.answers } : {}),
      })),
    };
  }
}
```

- [ ] **Step 4: Run — PASS**
```bash
npm --workspace backend test -- --testPathPattern=analytics.service
```

- [ ] **Step 5: Commit**
```bash
git add backend/src/analytics/analytics.service.ts backend/src/analytics/analytics.service.spec.ts
git commit -m "feat(backend): AnalyticsService.getOwnerAnalytics with per-question option counts"
```

---

## Task 3: AnalyticsService.getSystemAnalytics (TDD)

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts`
- Modify: `backend/src/analytics/analytics.service.spec.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('AnalyticsService.getSystemAnalytics', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);
  });

  it('aggregates user / poll / response totals', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      42, 3, 17, 9, 233,
    ] as any);
    const r = await svc.getSystemAnalytics();
    expect(r).toEqual({
      totalUsers: 42,
      totalAdmins: 3,
      totalPolls: 17,
      activePolls: 9,
      totalResponses: 233,
    });
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement — add to `AnalyticsService`**

```ts
async getSystemAnalytics() {
  const [totalUsers, totalAdmins, totalPolls, activePolls, totalResponses] =
    await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.poll.count(),
      this.prisma.poll.count({ where: { isActive: true } }),
      this.prisma.response.count(),
    ]);
  return { totalUsers, totalAdmins, totalPolls, activePolls, totalResponses };
}
```

- [ ] **Step 4: Run — PASS (4 tests total in this file)**

- [ ] **Step 5: Commit**
```bash
git add backend/src/analytics/analytics.service.ts backend/src/analytics/analytics.service.spec.ts
git commit -m "feat(backend): AnalyticsService.getSystemAnalytics aggregates"
```

---

## Task 4: AnalyticsController + AnalyticsModule + AppModule wiring

**Files:**
- Create: `backend/src/analytics/analytics.controller.ts`
- Create: `backend/src/analytics/analytics.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Controller**

`backend/src/analytics/analytics.controller.ts`:
```ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { AnalyticsService } from './analytics.service';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';
import { SystemAnalyticsDto } from './dto/system-analytics.dto';

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('polls/:id/analytics')
  @ApiOkResponse({ type: OwnerAnalyticsDto })
  getOwnerAnalytics(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.getOwnerAnalytics(user.id, id);
  }

  @Get('admin/analytics')
  @UseGuards(AdminRoleGuard)
  @ApiOkResponse({ type: SystemAnalyticsDto })
  getSystemAnalytics() {
    return this.svc.getSystemAnalytics();
  }
}
```

(The `AdminRoleGuard` is created in Task 5. This task's commit will TS-error on that import; resolve in T5.)

- [ ] **Step 2: Module**

`backend/src/analytics/analytics.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

- [ ] **Step 3: Wire into AppModule**

Add `import { AnalyticsModule } from './analytics/analytics.module';` and add `AnalyticsModule` to the `imports` array in `app.module.ts`.

- [ ] **Step 4: Commit (will not type-check until T5)**

```bash
git add backend/src/analytics/analytics.controller.ts backend/src/analytics/analytics.module.ts backend/src/app.module.ts
git commit -m "feat(backend): analytics controller + module (admin guard wired in T5)"
```

---

## Task 5: AdminRoleGuard

**Files:**
- Create: `backend/src/common/guards/admin-role.guard.ts`

- [ ] **Step 1: Implement**

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id?: string; role?: 'USER' | 'ADMIN' } | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }
    return true;
  }
}
```

- [ ] **Step 2: Type-check + smoke**

```bash
npm --workspace backend run check:ts
```
Expected: clean.

Smoke (with the stack down or after `pkill`):
```bash
pkill -f 'node backend/dist/main.js' 2>/dev/null || true
npm --workspace backend run build && \
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' \
  NODE_ENV='development' node backend/dist/main.js &
sleep 3

# Login as USER (any non-admin)
AUTH=/tmp/admin-guard.txt
rm -f "$AUTH"
curl -sf -c "$AUTH" -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"normal-user@example.com","name":"Normal","password":"hunter22!"}' >/dev/null

# /admin/analytics as non-admin -> 403
curl -s -b "$AUTH" -o /dev/null -w "non-admin -> %{http_code}\n" http://localhost:3000/api/v1/admin/analytics

# Login as admin
ADM=/tmp/adm.txt
rm -f "$ADM"
curl -sf -c "$ADM" -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"admin@polls.local","password":"admin"}' >/dev/null

# /admin/analytics as admin -> 200
curl -s -b "$ADM" -o /dev/null -w "admin -> %{http_code}\n" http://localhost:3000/api/v1/admin/analytics

kill %1 2>/dev/null || true
```
Expected: `non-admin -> 403`, `admin -> 200`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/guards/admin-role.guard.ts
git commit -m "feat(backend): AdminRoleGuard for ADMIN-only endpoints"
```

---

## Task 6: Admin users DTOs

**Files (all under `backend/src/users/dto/`):**
- `list-users-query.dto.ts`
- `user-summary.dto.ts`
- `user-list-response.dto.ts`
- `change-role.dto.ts`
- `bulk-delete.dto.ts`

- [ ] **Step 1: `list-users-query.dto.ts`**

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;
}
```

- [ ] **Step 2: `user-summary.dto.ts` + `user-list-response.dto.ts`**

```ts
// user-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
```

```ts
// user-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from './user-summary.dto';

export class UserListResponseDto {
  @ApiProperty({ type: [UserSummaryDto] }) items!: UserSummaryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
```

- [ ] **Step 3: `change-role.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
```

- [ ] **Step 4: `bulk-delete.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkDeleteDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}

export class BulkDeleteResultDto {
  @ApiProperty()
  count!: number;
}
```

- [ ] **Step 5: Type-check + commit**
```bash
npm --workspace backend run check:ts
git add backend/src/users/dto/
git commit -m "feat(backend): admin users DTOs (list/change-role/bulk-delete)"
```

---

## Task 7: UsersService.list (TDD)

**Files:**
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService.list', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('returns paginated users newest first', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [
        { id: 'u2', email: 'b@x.com', name: 'B', role: Role.USER, createdAt: new Date('2026-05-02') },
        { id: 'u1', email: 'a@x.com', name: 'A', role: Role.ADMIN, createdAt: new Date('2026-05-01') },
      ],
      2,
    ] as any);

    const r = await svc.list({ page: 1, pageSize: 20 });
    expect(r.total).toBe(2);
    expect(r.items.map((u) => u.id)).toEqual(['u2', 'u1']);
    expect(r.items[1].role).toBe(Role.ADMIN);
    expect(r.items[0].createdAt).toMatch(/^2026-05-02/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`backend/src/users/users.service.ts`:
```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: { page: number; pageSize: number }) {
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip, take: q.pageSize,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return {
      items: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**
```bash
git add backend/src/users/users.service.ts backend/src/users/users.service.spec.ts
git commit -m "feat(backend): UsersService.list paginated newest-first"
```

---

## Task 8: UsersService.changeRole (TDD) — invalidates RefreshTokens

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('UsersService.changeRole', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('updates role and deletes refresh tokens for that user', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'u1', email: 'x@x.com', name: 'X', role: Role.ADMIN, createdAt: new Date() },
      { count: 2 },
    ] as any);
    const r = await svc.changeRole({ adminId: 'a1', userId: 'u1', role: Role.ADMIN });
    expect(r.role).toBe(Role.ADMIN);
    // Transaction must do user.update AND refreshToken.deleteMany
    const [updateOp, deleteOp] = (prisma.$transaction.mock.calls[0][0] as any[]);
    expect(updateOp).toBeDefined();
    expect(deleteOp).toBeDefined();
  });

  it('throws NOT_FOUND on missing user', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('record not found'), { code: 'P2025' }),
    );
    await expect(svc.changeRole({ adminId: 'a1', userId: 'u9', role: Role.ADMIN }))
      .rejects.toThrow(/NOT_FOUND|Not Found/);
  });

  it('rejects an admin demoting themselves', async () => {
    await expect(svc.changeRole({ adminId: 'a1', userId: 'a1', role: Role.USER }))
      .rejects.toThrow(/SELF_DEMOTION_FORBIDDEN|Forbidden/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement — add to `UsersService`**

```ts
async changeRole(args: { adminId: string; userId: string; role: Role }) {
  if (args.adminId === args.userId && args.role !== Role.ADMIN) {
    throw new BadRequestException({
      code: 'SELF_DEMOTION_FORBIDDEN',
      message: 'Forbidden: you cannot demote yourself',
    });
  }
  try {
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: args.userId },
        data: { role: args.role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: args.userId } }),
    ]);
    return { ...updated, createdAt: updated.createdAt.toISOString() };
  } catch (e: any) {
    if (e?.code === 'P2025') {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**
```bash
git add backend/src/users/users.service.ts backend/src/users/users.service.spec.ts
git commit -m "feat(backend): UsersService.changeRole invalidates refresh tokens"
```

---

## Task 9: UsersService.bulkDelete (TDD) — self-protection + last-admin guard

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('UsersService.bulkDelete', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('deletes the listed users and returns the count', async () => {
    prisma.user.count.mockResolvedValueOnce(3); // total admins
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', role: Role.USER },
      { id: 'u2', role: Role.USER },
    ] as any);
    prisma.user.deleteMany.mockResolvedValueOnce({ count: 2 } as any);
    const r = await svc.bulkDelete({ adminId: 'a1', ids: ['u1', 'u2'] });
    expect(r.count).toBe(2);
  });

  it('rejects when ids include the current admin', async () => {
    await expect(svc.bulkDelete({ adminId: 'a1', ids: ['a1', 'u1'] }))
      .rejects.toThrow(/SELF_DELETION_FORBIDDEN|Forbidden/);
  });

  it('rejects when the operation would remove the last admin', async () => {
    prisma.user.count.mockResolvedValueOnce(2); // total admins
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', role: Role.ADMIN },
      { id: 'u2', role: Role.ADMIN },
    ] as any);
    await expect(svc.bulkDelete({ adminId: 'a1', ids: ['u1', 'u2'] }))
      .rejects.toThrow(/LAST_ADMIN_FORBIDDEN|Forbidden/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
async bulkDelete(args: { adminId: string; ids: string[] }) {
  if (args.ids.includes(args.adminId)) {
    throw new ForbiddenException({
      code: 'SELF_DELETION_FORBIDDEN',
      message: 'Forbidden: you cannot delete yourself',
    });
  }
  const [totalAdmins, victims] = await Promise.all([
    this.prisma.user.count({ where: { role: Role.ADMIN } }),
    this.prisma.user.findMany({
      where: { id: { in: args.ids } },
      select: { id: true, role: true },
    }),
  ]);
  const adminsAmongVictims = victims.filter((v) => v.role === Role.ADMIN).length;
  if (adminsAmongVictims >= totalAdmins) {
    throw new ForbiddenException({
      code: 'LAST_ADMIN_FORBIDDEN',
      message: 'Forbidden: cannot remove the last admin',
    });
  }
  const r = await this.prisma.user.deleteMany({ where: { id: { in: args.ids } } });
  return { count: r.count };
}
```

(Make sure `ForbiddenException` is imported from `@nestjs/common`.)

- [ ] **Step 3: Run — PASS (5+ tests in users.service.spec.ts total)**

- [ ] **Step 4: Commit**
```bash
git add backend/src/users/users.service.ts backend/src/users/users.service.spec.ts
git commit -m "feat(backend): UsersService.bulkDelete with self + last-admin guards"
```

---

## Task 10: UsersService.streamCsv (TDD)

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1: Append failing test**

```ts
describe('UsersService.streamCsv', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('produces a UTF-8 BOM CSV with all users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.com', name: 'A', role: Role.ADMIN, createdAt: new Date('2026-05-01T00:00:00Z') },
      { id: 'u2', email: 'b@x.com', name: 'B, jr.', role: Role.USER, createdAt: new Date('2026-05-02T00:00:00Z') },
    ] as any);

    const csv = await svc.streamCsv();
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.replace(/^﻿/, '').split('\n').filter(Boolean);
    expect(lines[0]).toBe('id,name,email,role,createdAt');
    expect(lines[1]).toBe('u1,A,a@x.com,ADMIN,2026-05-01T00:00:00.000Z');
    // Embedded comma in name → quoted
    expect(lines[2]).toBe('u2,"B, jr.",b@x.com,USER,2026-05-02T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Implement**

```ts
async streamCsv(): Promise<string> {
  const users = await this.prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const header = 'id,name,email,role,createdAt';
  const body = users.map((u) =>
    [u.id, u.name, u.email, u.role, u.createdAt.toISOString()].map(escape).join(','),
  ).join('\n');
  return '﻿' + header + '\n' + body;
}
```

- [ ] **Step 3: Run — PASS**

- [ ] **Step 4: Commit**
```bash
git add backend/src/users/users.service.ts backend/src/users/users.service.spec.ts
git commit -m "feat(backend): UsersService.streamCsv (UTF-8 BOM, RFC-4180 escaping)"
```

---

## Task 11: UsersController + UsersModule + AppModule wiring + smoke

**Files:**
- Create: `backend/src/users/users.controller.ts`
- Create: `backend/src/users/users.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Controller**

```ts
import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { BulkDeleteDto, BulkDeleteResultDto } from './dto/bulk-delete.dto';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminRoleGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserListResponseDto })
  list(@Query() q: ListUsersQueryDto) {
    return this.svc.list(q);
  }

  @Patch(':id/role')
  @ApiOkResponse({ type: UserSummaryDto })
  changeRole(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ChangeRoleDto,
  ) {
    return this.svc.changeRole({ adminId: admin.id, userId: id, role: body.role });
  }

  @Post('bulk-delete')
  @HttpCode(200)
  @ApiOkResponse({ type: BulkDeleteResultDto })
  bulkDelete(@CurrentUser() admin: CurrentUserPayload, @Body() body: BulkDeleteDto) {
    return this.svc.bulkDelete({ adminId: admin.id, ids: body.ids });
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  async exportCsv(@Res({ passthrough: false }) res: Response) {
    const csv = await this.svc.streamCsv();
    res.end(csv);
  }
}
```

- [ ] **Step 2: Module**

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 3: Wire into AppModule (and confirm type-check is clean across analytics + users)**

Add `import { UsersModule } from './users/users.module';` and add `UsersModule` to the imports list.

```bash
npm --workspace backend run check:ts
```
Expected: clean.

- [ ] **Step 4: Smoke admin endpoints**

```bash
pkill -f 'node backend/dist/main.js' 2>/dev/null || true
npm --workspace backend run build && \
  DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
  JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' \
  NODE_ENV='development' node backend/dist/main.js &
sleep 3

ADM=/tmp/adm.txt
rm -f "$ADM"
curl -sf -c "$ADM" -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"admin@polls.local","password":"admin"}' >/dev/null

# List
curl -sf -b "$ADM" "http://localhost:3000/api/v1/admin/users?page=1&pageSize=20" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("users count:",d["total"])'

# CSV
curl -sf -b "$ADM" -o /tmp/users.csv -w "csv -> %{http_code}, size=%{size_download}\n" \
  "http://localhost:3000/api/v1/admin/users/export.csv"
head -2 /tmp/users.csv

# Stats
curl -sf -b "$ADM" http://localhost:3000/api/v1/admin/analytics | head -c 200
echo

kill %1 2>/dev/null || true
```
Expected: total ≥ 1, CSV downloads (size > 0), `/admin/analytics` returns the 5-field stats object.

- [ ] **Step 5: Commit**
```bash
git add backend/src/users/users.controller.ts backend/src/users/users.module.ts backend/src/app.module.ts
git commit -m "feat(backend): admin users controller (list/role/bulk-delete/csv)"
```

---

## Task 12: Backend e2e — analytics + admin

**Files:**
- Create: `backend/test/analytics.e2e-spec.ts`
- Create: `backend/test/admin.e2e-spec.ts`

- [ ] **Step 1: Analytics e2e**

Use the same Testcontainers boilerplate as the existing e2e specs. Cover:
- register owner, create poll with SINGLE_CHOICE + TEXT
- (separate agent) anon submits → response counted
- owner GET /polls/:id/analytics → 200 with `totalResponses=1`, option counts match, text answerCount=1
- another user GET /polls/:id/analytics → 404 (owner-scoped)

- [ ] **Step 2: Admin e2e**

Cover:
- register USER, login as admin (existing seed)
- GET /admin/users → contains admin + new user
- GET /admin/users (as the USER, who is non-admin) → 403
- PATCH /admin/users/:id/role with `role: ADMIN` (promote the USER) → 200
- The promoted user must re-login (their old refresh token is invalid) — confirm by attempting `POST /auth/refresh` with the old cookie → 401
- POST /admin/users/bulk-delete with the (now-admin) user's id → that's now an admin; ensure it doesn't trip last-admin (seed admin still exists). Use a second non-admin user to test self-protection: `POST /admin/users/bulk-delete` with the seed admin's own id → 403 SELF_DELETION_FORBIDDEN.
- GET /admin/users/export.csv → 200, content-type `text/csv; charset=utf-8`, first line equals the header.

- [ ] **Step 3: Run**
```bash
pkill -f 'node backend/dist/main.js' 2>/dev/null || true
npm --workspace backend run test:e2e
```
Expected: every e2e file passes — auth + polls + responses + analytics + admin.

- [ ] **Step 4: Commit**
```bash
git add backend/test/analytics.e2e-spec.ts backend/test/admin.e2e-spec.ts
git commit -m "test(backend): analytics + admin e2e coverage"
```

---

## Task 13: Regenerate OpenAPI spec + frontend types

- [ ] **Step 1**: Run
```bash
DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
JWT_ACCESS_SECRET='dev-access-secret' \
JWT_REFRESH_SECRET='dev-refresh-secret' \
npm run gen:api
```

- [ ] **Step 2: Verify new paths**
```bash
for p in /polls/{id}/analytics /admin/analytics /admin/users /admin/users/{id}/role /admin/users/bulk-delete /admin/users/export.csv; do
  grep -c "\"$p\"" openapi.json | xargs -I {} echo "$p -> {}"
done
```
Each prints ≥ 1.

- [ ] **Step 3: Front type-check**
```bash
npm --workspace frontend run check:ts
```

- [ ] **Step 4: Commit**
```bash
git add openapi.json frontend/src/api/schema.ts
git commit -m "feat(api): regenerate spec/types for analytics + admin"
```

---

## Task 14: Frontend — analytics query

**Files:**
- Create: `frontend/src/api/queries/analytics.ts`

- [ ] **Step 1: Implement**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function usePollAnalytics(pollId: string | undefined) {
  return useQuery({
    enabled: !!pollId,
    queryKey: ['polls', pollId, 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/polls/{id}/analytics', { params: { path: { id: pollId! } } });
      if (!r.response.ok) throw r.error ?? new Error('Could not load analytics');
      return r.data!;
    },
  });
}
```

- [ ] **Step 2: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/api/queries/analytics.ts
git commit -m "feat(frontend): analytics query hook"
```

---

## Task 15: Frontend — admin queries + mutations

**Files:**
- Create: `frontend/src/api/queries/admin.ts`
- Create: `frontend/src/api/mutations/admin.ts`

- [ ] **Step 1: Queries**

```ts
// queries/admin.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useAdminUsers(args: { page?: number; pageSize?: number } = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  return useQuery({
    queryKey: ['admin', 'users', { page, pageSize }],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/users', {
        params: { query: { page, pageSize } } as any,
      });
      if (!r.response.ok) throw r.error ?? new Error('Could not load users');
      return r.data!;
    },
  });
}

export function useSystemAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/analytics');
      if (!r.response.ok) throw r.error ?? new Error('Could not load system analytics');
      return r.data!;
    },
  });
}
```

- [ ] **Step 2: Mutations**

```ts
// mutations/admin.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type Role = components['schemas']['ChangeRoleDto']['role'];

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; role: Role }) => {
      const r = await apiClient.PATCH('/admin/users/{id}/role', {
        params: { path: { id: args.id } },
        body: { role: args.role },
      });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Role change failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useBulkDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiClient.POST('/admin/users/bulk-delete', { body: { ids } });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Bulk delete failed'), { code });
      }
      return r.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
```

- [ ] **Step 3: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/api/queries/admin.ts frontend/src/api/mutations/admin.ts
git commit -m "feat(frontend): admin queries + mutations"
```

---

## Task 16: AnalyticsView + QuestionAnalyticsCard components (shared by owner + admin)

**Files:**
- Create: `frontend/src/components/analytics/AnalyticsView.tsx`
- Create: `frontend/src/components/analytics/QuestionAnalyticsCard.tsx`

- [ ] **Step 1: QuestionAnalyticsCard**

```tsx
import { Card } from '../primitives/Card';
import type { components } from '../../api/schema';

type Question = components['schemas']['QuestionAggregateDto'];

export function QuestionAnalyticsCard({ question }: { question: Question }) {
  const total = question.options.reduce((s, o) => s + o.count, 0);

  return (
    <Card size="sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{question.text}</p>
        <p className="text-xs text-gray-500">
          {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
        </p>
      </div>
      {question.type === 'TEXT' ? (
        <p className="mt-3 text-sm text-gray-500">
          {question.textAnswerCount ?? 0} text response{(question.textAnswerCount ?? 0) === 1 ? '' : 's'} recorded.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {question.options.map((o) => {
            const pct = total === 0 ? 0 : Math.round((o.count / total) * 100);
            return (
              <li key={o.optionId}>
                <div className="flex items-baseline justify-between text-xs text-gray-600">
                  <span>{o.text}</span>
                  <span>{o.count} ({pct}%)</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: AnalyticsView**

```tsx
import { Card } from '../primitives/Card';
import { QuestionAnalyticsCard } from './QuestionAnalyticsCard';
import type { components } from '../../api/schema';

type Analytics = components['schemas']['OwnerAnalyticsDto'];

export function AnalyticsView({ analytics }: { analytics: Analytics }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-sm font-medium text-gray-500">Total responses</p>
        <p className="mt-1 text-4xl font-bold text-gray-900">{analytics.totalResponses}</p>
      </Card>
      <div className="flex flex-col gap-4">
        {analytics.questions.map((q) => (
          <QuestionAnalyticsCard key={q.questionId} question={q} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/components/analytics/
git commit -m "feat(frontend): AnalyticsView + QuestionAnalyticsCard with progress bars"
```

---

## Task 17: AdminLayout (dark sidebar, ported from `design/AdminScreens.jsx`)

**Files:**
- Create: `frontend/src/layouts/AdminLayout/AdminLayout.tsx`
- Create: `frontend/src/layouts/AdminLayout/AdminSidebar.tsx`
- Create: `frontend/src/layouts/AdminLayout/AdminHeader.tsx`

- [ ] **Step 1: AdminSidebar**

Use these nav items (the design's `Polls` and `System` are noted as deferred for v1):

```tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useLogoutMutation } from '../../auth/auth-mutations';
import { Avatar } from '../../components/primitives/Avatar';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'users',     label: 'Users',     to: '/admin/users' },
  { key: 'analytics', label: 'Analytics', to: '/admin/analytics' },
] as const;

export function AdminSidebar() {
  const { user } = useAuth();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-300 flex flex-col">
      <div className="h-16 px-6 flex items-center gap-2 border-b border-gray-800">
        <img src="/logo-mark.svg" width={24} height={24} alt="" className="hidden sm:inline" />
        <span className="text-lg font-bold text-white tracking-tight">Polls</span>
        <span className="ml-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tracking-wider">
          ADMIN
        </span>
      </div>
      <nav className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size="sm" variant="dark" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
          className="mt-3 w-full text-left rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

> Note: this file references `/logo-mark.svg`. If `frontend/public/logo-mark.svg` doesn't exist, copy `design/logo-mark.svg` into `frontend/public/` as part of this commit.

- [ ] **Step 2: AdminHeader**

```tsx
import { ReactNode } from 'react';

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
```

- [ ] **Step 3: AdminLayout**

```tsx
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 bg-gray-50"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**
```bash
cp design/logo-mark.svg frontend/public/logo-mark.svg 2>/dev/null || true
git add frontend/src/layouts/AdminLayout/ frontend/public/logo-mark.svg 2>/dev/null
git commit -m "feat(frontend): AdminLayout + AdminSidebar (dark) + AdminHeader"
```

---

## Task 18: Owner per-poll analytics screen

**Files:**
- Create: `frontend/src/routes/polls/analytics/OwnerAnalyticsScreen.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Screen**

```tsx
import { Link, useParams } from 'react-router-dom';
import { usePollAnalytics } from '../../../api/queries/analytics';
import { Card } from '../../../components/primitives/Card';
import { Spinner } from '../../../components/primitives/Spinner';
import { Button } from '../../../components/primitives/Button';
import { AnalyticsView } from '../../../components/analytics/AnalyticsView';

export function OwnerAnalyticsScreen() {
  const { id } = useParams<{ id: string }>();
  const q = usePollAnalytics(id);

  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  if (q.isError || !q.data) {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-sm text-red-600">Could not load analytics.</p>
        <Link to="/dashboard" className="mt-3 inline-block"><Button variant="secondary" size="sm">Back to dashboard</Button></Link>
      </Card>
    );
  }

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500">Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900">{q.data.title}</h1>
        </div>
        <Link to="/dashboard"><Button variant="secondary" size="sm">Back</Button></Link>
      </div>
      <AnalyticsView analytics={q.data} />
    </section>
  );
}
```

- [ ] **Step 2: Router — add `/polls/:id/analytics`**

In `frontend/src/router.tsx`:
```tsx
import { OwnerAnalyticsScreen } from './routes/polls/analytics/OwnerAnalyticsScreen';
// ...inside the MainLayout children:
{ path: '/polls/:id/analytics', element: <RequireAuth><OwnerAnalyticsScreen /></RequireAuth> },
```

Also add an "Analytics" button to `PollListItem.tsx` (between "Copy link" and "Edit"):
```tsx
<Button variant="secondary" size="sm" onClick={() => navigate(`/polls/${poll.id}/analytics`)}>
  Analytics
</Button>
```

- [ ] **Step 3: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/routes/polls/analytics/ frontend/src/router.tsx frontend/src/routes/dashboard/PollListItem.tsx
git commit -m "feat(frontend): owner per-poll analytics screen + dashboard entry"
```

---

## Task 19: Admin Users screen

**Files:**
- Create: `frontend/src/routes/admin/users/UsersScreen.tsx`
- Create: `frontend/src/routes/admin/users/UsersTable.tsx`
- Create: `frontend/src/lib/download-csv.ts`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: CSV download helper**

```ts
// download-csv.ts
export async function downloadCsv(url: string, filename = 'users.csv') {
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) throw new Error('CSV download failed');
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
```

- [ ] **Step 2: UsersTable**

```tsx
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '../../../api/schema';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { Select } from '../../../components/primitives/Select';
import { Avatar } from '../../../components/primitives/Avatar';
import { useChangeUserRole } from '../../../api/mutations/admin';
import { useAuth } from '../../../auth/useAuth';

type User = components['schemas']['UserSummaryDto'];

export function UsersTable({ users, selected, onToggle, onToggleAll }: {
  users: User[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = useMemo(() => users.length > 0 && users.every((u) => selected.includes(u.id)), [users, selected]);
  const changeRole = useChangeUserRole();
  const { user: me } = useAuth();

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
            <th className="px-4 py-3 font-medium text-gray-600">User</th>
            <th className="px-4 py-3 font-medium text-gray-600">Role</th>
            <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
            <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSel = selected.includes(u.id);
            const isMe = me?.id === u.id;
            return (
              <tr key={u.id} className={isSel ? 'bg-indigo-50/40' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={isSel}
                    disabled={isMe}
                    onChange={() => onToggle(u.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900">{u.name}{isMe && <span className="ml-2 text-xs text-gray-500">(you)</span>}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(u.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <Select
                    defaultValue={u.role}
                    className="h-8 w-28 text-xs"
                    disabled={isMe || changeRole.isPending}
                    onChange={(e) => {
                      const role = e.target.value as 'USER' | 'ADMIN';
                      if (role === u.role) return;
                      changeRole.mutate({ id: u.id, role }, {
                        onSuccess: () => toast.success(`${u.name} is now ${role}`),
                        onError: (err: any) => toast.error(err?.message ?? 'Role change failed'),
                      });
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 3: UsersScreen**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminHeader } from '../../../layouts/AdminLayout/AdminHeader';
import { Button } from '../../../components/primitives/Button';
import { Spinner } from '../../../components/primitives/Spinner';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { useAdminUsers } from '../../../api/queries/admin';
import { useBulkDeleteUsers } from '../../../api/mutations/admin';
import { UsersTable } from './UsersTable';
import { downloadCsv } from '../../../lib/download-csv';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export function UsersScreen() {
  const usersQ = useAdminUsers();
  const bulkDelete = useBulkDeleteUsers();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => {
    if (!usersQ.data) return;
    const all = usersQ.data.items.map((u) => u.id);
    setSelected((p) => (p.length === all.length ? [] : all));
  };

  const confirmDelete = () => {
    bulkDelete.mutate(selected, {
      onSuccess: (r) => {
        toast.success(`Deleted ${r.count} user${r.count === 1 ? '' : 's'}`);
        setSelected([]);
        setConfirming(false);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Bulk delete failed');
        setConfirming(false);
      },
    });
  };

  return (
    <>
      <AdminHeader
        title="Users"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(`${API_BASE}/admin/users/export.csv`)}
          >
            Export CSV
          </Button>
        }
      />
      <div className="p-6 max-w-5xl">
        {selected.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-indigo-50 border border-indigo-100 px-4 py-3">
            <span className="text-sm font-medium text-indigo-700">
              {selected.length} user{selected.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelected([])}>Clear</Button>
              <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
                Delete selected
              </Button>
            </div>
          </div>
        )}
        {usersQ.isLoading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : usersQ.isError || !usersQ.data ? (
          <p className="text-sm text-red-600">Could not load users.</p>
        ) : (
          <UsersTable
            users={usersQ.data.items}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.length} user${selected.length === 1 ? '' : 's'}?`}
          body="This will permanently delete the selected accounts and all their polls."
          confirmLabel="Delete"
          isPending={bulkDelete.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Router — add `/admin/users` inside `AdminLayout`**

In `frontend/src/router.tsx`, add a second top-level route group:
```tsx
import { AdminLayout } from './layouts/AdminLayout/AdminLayout';
import { RequireAdmin } from './auth/RequireAdmin';
import { UsersScreen } from './routes/admin/users/UsersScreen';

// As a sibling of the existing MainLayout entry:
{
  element: <RequireAdmin><AdminLayout /></RequireAdmin>,
  children: [
    { path: '/admin/users', element: <UsersScreen /> },
  ],
},
```

- [ ] **Step 5: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/lib/download-csv.ts frontend/src/routes/admin/users/ frontend/src/router.tsx
git commit -m "feat(frontend): admin users screen with role select, bulk delete, CSV export"
```

---

## Task 20: Admin System Analytics screen

**Files:**
- Create: `frontend/src/routes/admin/analytics/SystemAnalyticsScreen.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Screen**

```tsx
import { AdminHeader } from '../../../layouts/AdminLayout/AdminHeader';
import { Card } from '../../../components/primitives/Card';
import { Spinner } from '../../../components/primitives/Spinner';
import { useSystemAnalytics } from '../../../api/queries/admin';

function Stat({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card size="sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}

export function SystemAnalyticsScreen() {
  const q = useSystemAnalytics();
  return (
    <>
      <AdminHeader title="System analytics" />
      <div className="p-6 max-w-5xl">
        {q.isLoading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : q.isError || !q.data ? (
          <p className="text-sm text-red-600">Could not load system analytics.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat title="Total users" value={q.data.totalUsers} hint={`${q.data.totalAdmins} admin${q.data.totalAdmins === 1 ? '' : 's'}`} />
            <Stat title="Total polls" value={q.data.totalPolls} hint={`${q.data.activePolls} active`} />
            <Stat title="Total responses" value={q.data.totalResponses} />
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Router — add to the admin group**

In `frontend/src/router.tsx`, add to the AdminLayout children:
```tsx
{ path: '/admin/analytics', element: <SystemAnalyticsScreen /> },
```

- [ ] **Step 3: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/routes/admin/analytics/ frontend/src/router.tsx
git commit -m "feat(frontend): admin system analytics screen"
```

---

## Task 21: Header — "Admin Panel" link for admins

**Files:**
- Modify: `frontend/src/layouts/MainLayout/Header.tsx`

- [ ] **Step 1: Add the admin link**

In the JSX where the user is signed in, insert before the existing `/dashboard` link:
```tsx
{user.role === 'ADMIN' && (
  <Link
    to="/admin/users"
    className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
  >
    Admin Panel
  </Link>
)}
```

- [ ] **Step 2: Type-check + commit**
```bash
npm --workspace frontend run check:ts
git add frontend/src/layouts/MainLayout/Header.tsx
git commit -m "feat(frontend): show Admin Panel link for ADMIN role"
```

---

## Task 22: Playwright e2e — full lifecycle + admin role flow

**Files:**
- Modify: `frontend/package.json` — add `@playwright/test`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/auth-and-polls.spec.ts`
- Create: `frontend/e2e/admin.spec.ts`

- [ ] **Step 1: Install Playwright**
```bash
npm --workspace frontend install --save-dev @playwright/test
npx --workspace frontend playwright install chromium
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

- [ ] **Step 3: `auth-and-polls.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('register → create poll → anon submit → see in analytics', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-owner-${id}@example.com`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Owner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Create
  await page.getByRole('link', { name: 'Create poll' }).click();
  await page.getByLabel('Title').fill('E2E Poll');
  await page.getByLabel('Visibility').selectOption('PUBLIC');
  // Add one option text
  await page.locator('input[placeholder="What\\\'s your question?"]').fill('Pick one');
  await page.locator('input[placeholder^="Option 1"]').fill('A');
  await page.locator('input[placeholder^="Option 2"]').fill('B');
  await page.getByRole('button', { name: 'Create poll' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Copy the link
  await page.getByRole('button', { name: 'Copy link' }).first().click();
  // Sniff the URL from the row
  const rowText = await page.locator('text=/\\/[A-Za-z0-9_-]{10}/').first().textContent();
  const slug = rowText?.trim().replace('/', '').split(' ')[0]!;
  expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);

  // Anonymous browser
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`/p/${slug}`);
  await anonPage.getByLabel('A').check();
  await anonPage.getByRole('button', { name: 'Submit response' }).click();
  await expect(anonPage.getByText('Thank you!')).toBeVisible();
  await anon.close();

  // Back to owner, see analytics
  await page.getByRole('button', { name: 'Analytics' }).first().click();
  await expect(page.getByText('Total responses')).toBeVisible();
  await expect(page.getByText('1', { exact: true })).toBeVisible();
});
```

- [ ] **Step 4: `admin.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('admin promotes a user → user sees Admin Panel link after re-login', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-target-${id}@example.com`;

  // Register a regular user
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Target');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Open admin panel
  await page.getByRole('link', { name: 'Admin Panel' }).click();
  await expect(page).toHaveURL(/\/admin\/users/);

  // Promote E2E Target
  const targetRow = page.locator('tr', { has: page.getByText(email) });
  await targetRow.locator('select').selectOption('ADMIN');
  await expect(page.getByText(`E2E Target is now ADMIN`)).toBeVisible();

  // Open a fresh context, login as the promoted user, see Admin Panel link
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.getByLabel('Email').fill(email);
  await p2.getByLabel('Password').fill('hunter22!');
  await p2.getByRole('button', { name: 'Sign in' }).click();
  await expect(p2.getByRole('link', { name: 'Admin Panel' })).toBeVisible();
  await ctx.close();
});
```

- [ ] **Step 5: Run e2e against the live stack**
```bash
docker-compose up -d --build
sleep 15
npm --workspace frontend run test:e2e
```
Expected: both tests pass.

- [ ] **Step 6: Commit**
```bash
git add frontend/package.json frontend/playwright.config.ts frontend/e2e/ package-lock.json
git commit -m "test(frontend): playwright e2e for create+submit+analytics and admin promotion"
```

---

## Task 23: Final smoke + README update

- [ ] **Step 1: Verify the compose stack is healthy**
```bash
docker-compose ps
curl -sf http://localhost:5173/ >/dev/null && echo "frontend ok"
curl -sf http://localhost:3000/api/v1/health && echo
```

- [ ] **Step 2: Manual browser walk** (open in a browser):
1. http://localhost:5173/ → land on the landing page (or dashboard if still logged in).
2. Log in as the admin → see "Admin Panel" link in the header.
3. Click into `/admin/users` → table shows all users. Try changing one user's role; the row should update.
4. Click `Export CSV` → file downloads.
5. Visit `/admin/analytics` → see system stats (users, polls, responses).
6. Back to `/dashboard` → click "Analytics" on any poll → per-question breakdown.
7. Open `/p/<slug>` in an incognito → answer → "Thank you!" → analytics on owner side updates.

- [ ] **Step 3: Regen gen:api to confirm sync**
```bash
DATABASE_URL='postgresql://polls:polls@localhost:5432/survey_app' \
JWT_ACCESS_SECRET='dev-access-secret' \
JWT_REFRESH_SECRET='dev-refresh-secret' \
npm run gen:api
git diff --exit-code openapi.json frontend/src/api/schema.ts
```
Expected: empty diff.

- [ ] **Step 4: Update README**

Add a "Plan 3 surface" section to `README.md` listing:
- Owner per-poll analytics at `/polls/:id/analytics`.
- Admin Panel (`/admin/users`, `/admin/analytics`) for users with `role === 'ADMIN'`.
- CSV user export.
- Role change forces re-login (refresh tokens revoked).
- Playwright e2e covering two critical flows; runs via `npm run test:e2e`.

- [ ] **Step 5: Commit**
```bash
git add README.md
git commit -m "docs: note plan 3 surface (analytics + admin)"
```

---

## Definition of done (Plan 3)

- [ ] `docker-compose up --build` brings the stack up cleanly.
- [ ] Owners can see per-poll analytics with per-question option counts; bars reflect counts proportionally.
- [ ] Admins can see all users, change a user's role (which forces that user to re-login), bulk-delete users (with self + last-admin guards), and download a UTF-8 CSV.
- [ ] Admin layout uses the dark sidebar; sidebar's "Dashboard" link returns the admin to `/dashboard`.
- [ ] System analytics page shows totals.
- [ ] All backend unit specs pass; all e2e specs pass (auth + polls + responses + analytics + admin).
- [ ] Playwright e2e — both flows pass against the live stack.
- [ ] `npm run check:ts` clean on both workspaces.
- [ ] `npm run gen:api && git diff --exit-code` — spec in sync.

End of v1.

---

**2026-05-27 update:** The admin surface was reworked from a separate `AdminLayout` panel into nested tabs on `/dashboard`. See [2026-05-27-unified-dashboard-design.md](../specs/2026-05-27-unified-dashboard-design.md) and the implementation in [2026-05-27-unified-dashboard.md](2026-05-27-unified-dashboard.md).
