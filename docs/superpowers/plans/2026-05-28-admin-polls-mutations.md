# Admin polls mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-scoped backend endpoints + frontend hooks + route variants so admin can edit / delete / toggle / view analytics on any poll from the All Polls tab. Distinguish admin vs owner context via URL paths (`/dashboard/all-polls/:id/edit`, `/dashboard/all-polls/:id/analytics`).

**Architecture:** Five new admin endpoints under `/api/v1/admin/polls/:id` (read, update, delete, toggle active, analytics). New service methods mirror the owner-scoped ones minus the `ownerId` filter. Frontend gains 2 new query hooks + 3 new mutation hooks (under `api/queries/admin.ts` and a new `api/mutations/admin.ts`). `AdminPollsTable`, `PollForm`, `PollFormModal`, and `AnalyticsModal` each accept a `context: 'owner' | 'admin'` prop that selects which hook variant + URL paths to use. `DashboardShell` matches two more URL paths and renders the modals with `context="admin"`.

**Tech Stack:** NestJS 10 + Prisma backend; React 19 + TanStack Query + react-router-dom 6 + sonner + Tailwind frontend. OpenAPI schema regen via `npm run gen:api` from repo root.

**Spec:** [docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md](../specs/2026-05-28-admin-polls-mutations-design.md)

---

## File map

**Backend modify:**
- `backend/src/polls/polls.service.ts` — add `findOneById`, `updateById`, `deleteById`, `toggleActiveById`
- `backend/src/polls/admin-polls.controller.ts` — add 4 new handler methods (GET, PATCH, DELETE, PATCH active)
- `backend/src/analytics/analytics.service.ts` — add `getAnalyticsById(pollId)`
- `backend/src/analytics/analytics.controller.ts` — add `GET /admin/polls/:id/analytics`

**Backend regenerate:** `openapi.json`, `frontend/src/api/schema.ts`

**Frontend create:**
- `frontend/src/api/mutations/admin.ts` (NEW — file doesn't exist yet)

**Frontend modify:**
- `frontend/src/api/queries/admin.ts` — add `useAdminPoll`, `useAdminPollAnalytics`
- `frontend/src/routes/dashboard/AdminPollsTable/types.ts` — add `context` prop to `AdminPollsTableProps`
- `frontend/src/routes/dashboard/AdminPollsTable/hooks/useAdminPollsTable.ts` — accept `context`, select hooks + URL paths
- `frontend/src/routes/dashboard/AllPollsTab/AllPollsTab.tsx` — pass `context="admin"`
- `frontend/src/routes/dashboard/AllPollsTab/hooks/useAllPollsTab.ts` — use `useDeleteAdminPoll`
- `frontend/src/routes/dashboard/PollForm/types.ts` — add `context` prop
- `frontend/src/routes/dashboard/PollForm/hooks/usePollForm.ts` — accept `context`, switch hooks
- `frontend/src/routes/dashboard/PollForm/PollForm.tsx` — pass `context` through
- `frontend/src/layouts/DashboardShell/modals/PollFormModal/types.ts` — add `context`
- `frontend/src/layouts/DashboardShell/modals/PollFormModal/PollFormModal.tsx` — thread `context` to `PollForm`; pick close target
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/types.ts` — add `context`
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/hooks/useAnalyticsModal.ts` — accept `context`, switch hooks
- `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/AnalyticsModal.tsx` — accept `context`, pass to hook; pick close target
- `frontend/src/layouts/DashboardShell/DashboardShell.tsx` — add 2 more `useMatch` checks + admin modal renders
- `frontend/src/router.tsx` — add `all-polls/:id/edit` and `all-polls/:id/analytics` routes

---

## Task 1: Backend service methods

**Files:**
- Modify: `backend/src/polls/polls.service.ts`
- Modify: `backend/src/analytics/analytics.service.ts`

- [ ] **Step 1: Add 4 admin methods to PollsService**

Read `backend/src/polls/polls.service.ts` first. Insert these methods immediately after the existing `toggleActive` method (around line 188). Place them in this order:

```ts
  async findOneById(id: string) {
    const p = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    return this.toDetail(p);
  }

  async updateById(id: string, dto: UpdatePollDto) {
    const existing = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const hasResponses = existing._count.responses > 0;

    if (hasResponses) {
      if (this.structuralDiff(existing, dto)) {
        throw new ConflictException({
          code: 'POLL_LOCKED_HAS_RESPONSES',
          message: 'POLL_LOCKED_HAS_RESPONSES: Questions and options cannot change after a poll has responses',
        });
      }
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
    return this.findOneById(id);
  }

  async deleteById(id: string) {
    const exists = await this.prisma.poll.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    await this.prisma.$transaction([
      this.prisma.answerOption.deleteMany({ where: { answer: { response: { pollId: id } } } }),
      this.prisma.answer.deleteMany({ where: { response: { pollId: id } } }),
      this.prisma.response.deleteMany({ where: { pollId: id } }),
      this.prisma.option.deleteMany({ where: { question: { pollId: id } } }),
      this.prisma.question.deleteMany({ where: { pollId: id } }),
      this.prisma.poll.delete({ where: { id } }),
    ]);
  }

  async toggleActiveById(id: string, isActive: boolean) {
    const r = await this.prisma.poll.updateMany({
      where: { id },
      data: { isActive },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
  }
```

Each is the owner-scoped sibling minus the `ownerId` filter. `findUnique({ where: { id } })` replaces `findFirst({ where: { id, ownerId } })`. For `toggleActiveById`, `updateMany` is kept for parity with the owner method.

- [ ] **Step 2: Add `getAnalyticsById` to AnalyticsService**

Read `backend/src/analytics/analytics.service.ts` first. Insert this method immediately after the existing `getOwnerAnalytics` method (around line 58):

```ts
  async getAnalyticsById(pollId: string): Promise<OwnerAnalyticsDto> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
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
```

(Identical to `getOwnerAnalytics` minus the `ownerId` filter on the initial `findUnique`/`findFirst`.)

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app && npm run check:ts
```

Expected: clean. The new methods are unused so far; they typecheck on their own. If you see an error referencing `QuestionType` in `polls.service.ts`, ensure the existing import line at the top (`import { QuestionType } from '@prisma/client';`) is still present — no need to add it again.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add backend/src/polls/polls.service.ts backend/src/analytics/analytics.service.ts && \
git commit -m "$(cat <<'EOF'
feat(backend): add admin-scoped polls service methods

Add findOneById, updateById, deleteById, toggleActiveById to
PollsService (mirroring the owner-scoped methods without the ownerId
filter) and getAnalyticsById to AnalyticsService. Not wired to any
controller yet.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Backend controllers + schema regen

**Files:**
- Modify: `backend/src/polls/admin-polls.controller.ts`
- Modify: `backend/src/analytics/analytics.controller.ts`
- Regenerate: `openapi.json`, `frontend/src/api/schema.ts`

- [ ] **Step 1: Replace `admin-polls.controller.ts` with 4 new handlers**

Replace the full contents of `backend/src/polls/admin-polls.controller.ts` with:

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { PollsService } from './polls.service';
import { UpdatePollDto } from './dto/update-poll.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';
import { PollDetailDto, PollListResponseDto, PollSummaryDto } from './dto/poll-response.dto';

@ApiTags('admin-polls')
@Controller('admin/polls')
@UseGuards(AdminRoleGuard)
export class AdminPollsController {
  constructor(private readonly polls: PollsService) {}

  @Get()
  @ApiOkResponse({ type: PollListResponseDto })
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<PollListResponseDto> {
    return this.polls.findAll({ page: Number(page), pageSize: Number(pageSize) }) as any;
  }

  @Get(':id')
  @ApiOkResponse({ type: PollDetailDto })
  getOne(@Param('id') id: string) {
    return this.polls.findOneById(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PollDetailDto })
  update(@Param('id') id: string, @Body() body: UpdatePollDto) {
    return this.polls.updateById(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.polls.deleteById(id);
  }

  @Patch(':id/active')
  @ApiOkResponse({ type: PollSummaryDto })
  async toggleActive(@Param('id') id: string, @Body() body: ToggleActiveDto) {
    await this.polls.toggleActiveById(id, body.isActive);
    return this.polls.findOneById(id);
  }
}
```

Imports preserved style of existing controllers (e.g. `polls.controller.ts`). `toggleActive` returns the updated poll to mirror the owner endpoint's eventual response shape. Reading the owner `PollsController.toggleActive` (line ~50 of `polls.controller.ts`) — it has the same pattern (toggle then return). If the owner version differs (e.g. returns void), mirror it exactly.

- [ ] **Step 2: Modify `analytics.controller.ts` to add admin per-poll route**

Read `backend/src/analytics/analytics.controller.ts` first. Replace its full contents with:

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

  @Get('admin/polls/:id/analytics')
  @UseGuards(AdminRoleGuard)
  @ApiOkResponse({ type: OwnerAnalyticsDto })
  getAdminPollAnalytics(@Param('id') id: string) {
    return this.svc.getAnalyticsById(id);
  }

  @Get('admin/analytics')
  @UseGuards(AdminRoleGuard)
  @ApiOkResponse({ type: SystemAnalyticsDto })
  getSystemAnalytics() {
    return this.svc.getSystemAnalytics();
  }
}
```

Diffs vs. previous version: added the `getAdminPollAnalytics` route between the existing two methods.

- [ ] **Step 3: Regenerate OpenAPI schema + frontend typed schema**

From the repo root:

```bash
cd /Users/andreevxdr/sources/survey-app && npm run gen:api
```

If running outside Docker fails on DATABASE_URL (known limitation), run `spec:export` inside the backend container:

```bash
docker compose exec backend node -r ts-node/register src/spec-export.ts > /tmp/openapi.json
docker compose cp survey-app-backend-1:/tmp/openapi.json /Users/andreevxdr/sources/survey-app/openapi.json
cd /Users/andreevxdr/sources/survey-app && npx openapi-typescript ./openapi.json -o ./frontend/src/api/schema.ts
```

(Adapt the command shape to whatever worked in Spec 2 Task 1 — see commit `b480f47` for that recipe.)

Confirm the new paths are present:

```bash
grep '"/admin/polls/{id}"\|"/admin/polls/{id}/active"\|"/admin/polls/{id}/analytics"' /Users/andreevxdr/sources/survey-app/openapi.json /Users/andreevxdr/sources/survey-app/frontend/src/api/schema.ts | head
```

Expected: matches for all three paths in both files.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app && npm run check:ts
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add backend/src/polls/admin-polls.controller.ts \
        backend/src/analytics/analytics.controller.ts \
        openapi.json \
        frontend/src/api/schema.ts && \
git commit -m "$(cat <<'EOF'
feat(backend): admin polls endpoints + admin per-poll analytics

AdminPollsController gains GET/PATCH/DELETE /:id + PATCH /:id/active
handlers backed by the new admin-scoped service methods. The shared
AnalyticsController adds GET /admin/polls/:id/analytics, AdminRoleGuard-
gated, backed by AnalyticsService.getAnalyticsById. Regenerated
openapi.json + frontend schema.ts.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend admin query + mutation hooks

**Files:**
- Modify: `frontend/src/api/queries/admin.ts`
- Create: `frontend/src/api/mutations/admin.ts`

- [ ] **Step 1: Add admin query hooks to `api/queries/admin.ts`**

Read `frontend/src/api/queries/admin.ts` first. Append two new exports after the existing `useAdminPolls` (or wherever fits — keep alphabetical-ish grouping):

```ts
export function useAdminPoll(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['admin', 'polls', id],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/polls/{id}', { params: { path: { id: id! } } });
      if (!r.response.ok) throw r.error ?? new Error('Failed to load poll');
      return r.data!;
    },
  });
}

export function useAdminPollAnalytics(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['admin', 'polls', id, 'analytics'],
    queryFn: async () => {
      const r = await apiClient.GET('/admin/polls/{id}/analytics', { params: { path: { id: id! } } });
      if (!r.response.ok) throw r.error ?? new Error('Could not load analytics');
      return r.data!;
    },
  });
}
```

Both follow the exact pattern of the existing owner hooks `usePoll(id)` and `usePollAnalytics(pollId)`.

- [ ] **Step 2: Create `api/mutations/admin.ts`**

Write `frontend/src/api/mutations/admin.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type UpdatePollBody = components['schemas']['UpdatePollDto'];

export function useUpdateAdminPoll(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePollBody) => {
      const r = await apiClient.PATCH('/admin/polls/{id}', { params: { path: { id } }, body });
      if (!r.response.ok) throw r.error ?? new Error('Update failed');
      return r.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}

export function useDeleteAdminPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.DELETE('/admin/polls/{id}', { params: { path: { id } } });
      if (!r.response.ok) throw r.error ?? new Error('Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}

export function useAdminToggleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) => {
      const r = await apiClient.PATCH('/admin/polls/{id}/active', {
        params: { path: { id: args.id } },
        body: { isActive: args.isActive },
      });
      if (!r.response.ok) throw r.error ?? new Error('Toggle failed');
      return r.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      qc.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });
}
```

All three invalidate BOTH the owner and admin query trees (same pattern as `frontend/src/api/mutations/polls.ts`).

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/api/queries/admin.ts frontend/src/api/mutations/admin.ts && \
git commit -m "$(cat <<'EOF'
feat(frontend): add admin-scoped poll hooks

Two new queries (useAdminPoll, useAdminPollAnalytics) in
api/queries/admin.ts, and a new api/mutations/admin.ts file with
useUpdateAdminPoll, useDeleteAdminPoll, useAdminToggleActive. All
three mutations invalidate both ['polls'] and ['admin', 'polls']
trees to keep My polls and All polls in sync.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: AdminPollsTable + AllPollsTab context wiring

**Files:**
- Modify: `frontend/src/routes/dashboard/AdminPollsTable/types.ts`
- Modify: `frontend/src/routes/dashboard/AdminPollsTable/hooks/useAdminPollsTable.ts`
- Modify: `frontend/src/routes/dashboard/AllPollsTab/AllPollsTab.tsx`
- Modify: `frontend/src/routes/dashboard/AllPollsTab/hooks/useAllPollsTab.ts`

- [ ] **Step 1: Add `context` prop to `AdminPollsTableProps`**

Replace `frontend/src/routes/dashboard/AdminPollsTable/types.ts` with:

```ts
import type { components } from '../../../api/schema';

export type PollSummary = components['schemas']['PollSummaryDto'];

export type AdminPollsTableContext = 'owner' | 'admin';

export interface AdminPollsTableProps {
  polls: PollSummary[];
  onDelete: (id: string) => void;
  context?: AdminPollsTableContext;
}
```

- [ ] **Step 2: Replace `useAdminPollsTable.ts` to accept `context`**

Read the existing file first. Then replace its full contents with:

```ts
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { copyToClipboard } from '../../../../lib/copy-to-clipboard';
import { useToggleActive } from '../../../../api/mutations/polls';
import { useAdminToggleActive } from '../../../../api/mutations/admin';
import { useSidebarSearch } from '../../../../layouts/DashboardShell/SidebarSearchContext';
import type { AdminPollsTableContext, PollSummary } from '../types';

export function useAdminPollsTable({
  polls,
  context = 'owner',
}: {
  polls: PollSummary[];
  context?: AdminPollsTableContext;
}) {
  const navigate = useNavigate();
  const ownerToggle = useToggleActive();
  const adminToggle = useAdminToggleActive();
  const toggle = context === 'admin' ? adminToggle : ownerToggle;
  const { search } = useSidebarSearch();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return polls;
    return polls.filter((p) =>
      p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [polls, search]);

  const allFilteredIds = filtered.map((p) => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => setSelectedIds(allSelected ? [] : allFilteredIds);
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

  const onToggleActive = (poll: PollSummary) =>
    toggle.mutate({ id: poll.id, isActive: !poll.isActive });

  const onCopyLink = async (poll: PollSummary) => {
    const link = `${window.location.origin}/p/${poll.slug}`;
    const ok = await copyToClipboard(link);
    toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link');
  };

  const editPath = (poll: PollSummary) =>
    context === 'admin' ? `/dashboard/all-polls/${poll.id}/edit` : `/dashboard/polls/${poll.id}/edit`;
  const analyticsPath = (poll: PollSummary) =>
    context === 'admin' ? `/dashboard/all-polls/${poll.id}/analytics` : `/dashboard/polls/${poll.id}/analytics`;

  const onNavigateAnalytics = (poll: PollSummary) => navigate(analyticsPath(poll));
  const onNavigateEdit = (poll: PollSummary) => navigate(editPath(poll));

  const onExportCsv = () => toast.message('Export CSV — coming soon');
  const onBulkDelete = () => toast.message('Bulk delete — coming soon');

  return {
    filtered,
    selectedIds,
    allSelected,
    toggleAll,
    toggleOne,
    clearSelection,
    search,
    onToggleActive,
    onCopyLink,
    onNavigateAnalytics,
    onNavigateEdit,
    onExportCsv,
    onBulkDelete,
    isToggling: toggle.isPending,
  };
}
```

Diffs vs. previous version:
- Import `useAdminToggleActive` from the new `admin.ts` mutations file.
- New `context` parameter (default `'owner'`).
- `toggle` selects between owner and admin mutation based on `context`.
- New `editPath` / `analyticsPath` helpers that pick admin- or owner-flavored URLs.

The component (`AdminPollsTable.tsx`) needs no change — it consumes `vm.onNavigateEdit` and `vm.onNavigateAnalytics` which now route correctly. But it DOES need to forward the new `context` prop to the hook:

Look at `frontend/src/routes/dashboard/AdminPollsTable/AdminPollsTable.tsx` line ~10. It currently calls `useAdminPollsTable({ polls })`. Change to:

```tsx
const vm = useAdminPollsTable({ polls, context });
```

And destructure `context` in the function signature:

```tsx
export function AdminPollsTable({ polls, onDelete, context }: AdminPollsTableProps) {
```

(Keep the rest of the file unchanged.)

- [ ] **Step 3: Update `AllPollsTab/hooks/useAllPollsTab.ts` to use admin delete**

Read the existing file. Find the line:

```ts
import { useDeletePoll } from '../../../../api/mutations/polls';
```

Replace with:

```ts
import { useDeleteAdminPoll } from '../../../../api/mutations/admin';
```

Then find:

```ts
  const del = useDeletePoll();
```

Replace with:

```ts
  const del = useDeleteAdminPoll();
```

(Rest of file unchanged.)

- [ ] **Step 4: Update `AllPollsTab/AllPollsTab.tsx` to pass `context="admin"`**

Find the line:

```tsx
        <AdminPollsTable polls={vm.polls!} onDelete={vm.setPendingDeleteId} />
```

Replace with:

```tsx
        <AdminPollsTable polls={vm.polls!} onDelete={vm.setPendingDeleteId} context="admin" />
```

(Rest of file unchanged.)

- [ ] **Step 5: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/routes/dashboard/AdminPollsTable \
        frontend/src/routes/dashboard/AllPollsTab && \
git commit -m "$(cat <<'EOF'
feat(frontend): route AllPollsTab actions through admin endpoints

AdminPollsTable accepts a context: 'owner' | 'admin' prop and the
internal hook picks useToggleActive (owner) vs useAdminToggleActive
(admin) and the corresponding /dashboard/polls/... vs
/dashboard/all-polls/... URLs for Edit and Analytics navigation.
AllPollsTab passes context='admin' and uses useDeleteAdminPoll.
The new admin-flavored routes are added in a later task.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: PollForm context wiring

**Files:**
- Modify: `frontend/src/routes/dashboard/PollForm/types.ts`
- Modify: `frontend/src/routes/dashboard/PollForm/hooks/usePollForm.ts`
- Modify: `frontend/src/routes/dashboard/PollForm/PollForm.tsx`

- [ ] **Step 1: Add `context` to PollForm types**

Replace `frontend/src/routes/dashboard/PollForm/types.ts` with:

```ts
export type PollFormContext = 'owner' | 'admin';

export interface PollFormProps {
  /** Optional poll id when editing. Empty/undefined = create mode. */
  id?: string;
  /** Whether to route through admin- or owner-scoped backend hooks. Default 'owner'. */
  context?: PollFormContext;
  /** Called when the form successfully submits (so the host can close a modal / navigate). */
  onSuccess?: () => void;
  /** Called when the user cancels (Cancel button). */
  onCancel?: () => void;
}
```

- [ ] **Step 2: Replace `usePollForm.ts` to switch hooks by context**

Read the existing file. Then replace its full contents with:

```ts
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { BaseSyntheticEvent } from 'react';
import { pollFormSchema, type PollFormValues } from '../../../../forms/schemas/poll.schema';
import { useCreatePoll, useUpdatePoll } from '../../../../api/mutations/polls';
import { useUpdateAdminPoll } from '../../../../api/mutations/admin';
import { usePoll } from '../../../../api/queries/polls';
import { useAdminPoll } from '../../../../api/queries/admin';
import type { PollFormContext } from '../types';

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultQuestion: PollFormValues['questions'][number] = {
  type: 'SINGLE_CHOICE',
  text: '',
  isRequired: false,
  options: [{ text: '' }, { text: '' }],
};

export function usePollForm({
  id,
  context = 'owner',
  onSuccess,
}: {
  id?: string;
  context?: PollFormContext;
  onSuccess?: () => void;
}) {
  const isEdit = !!id;
  const isAdmin = context === 'admin';

  // Conditional fetch by passing undefined to the inactive hook. Both hooks
  // are always called; only one fires a network request thanks to enabled: !!id.
  const ownerPoll = usePoll(isAdmin ? undefined : id);
  const adminPoll = useAdminPoll(isAdmin ? id : undefined);
  const pollQuery = isAdmin ? adminPoll : ownerPoll;
  const poll = pollQuery.data;
  const locked = isEdit && (poll?.responseCount ?? 0) > 0;
  const responseCount = poll?.responseCount ?? 0;

  const create = useCreatePoll();
  const ownerUpdate = useUpdatePoll(id ?? '');
  const adminUpdate = useUpdateAdminPoll(id ?? '');
  const update = isAdmin ? adminUpdate : ownerUpdate;
  const [serverError, setServerError] = useState<string | null>(null);

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
  const { handleSubmit, control, reset } = methods;
  const questionFields = useFieldArray({ control, name: 'questions' });

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
        options: q.type === 'TEXT' ? [] : q.options.map((o) => ({ text: o.text })),
      })),
    });
  }, [isEdit, poll, reset]);

  const onSubmit = handleSubmit(async (values, e?: BaseSyntheticEvent) => {
    e?.preventDefault();
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
        options: q.type === 'TEXT' ? [] : (q.options ?? []),
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
      onSuccess?.();
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not save poll');
      toast.error('Could not save poll');
    }
  });

  const isSubmitting = create.isPending || update.isPending;

  const heading = useMemo(
    () => (isEdit ? `Edit "${poll?.title ?? '…'}"` : 'New poll'),
    [isEdit, poll?.title],
  );

  const isHydrating = isEdit && pollQuery.isLoading;

  function onAddQuestion() {
    questionFields.append({ ...defaultQuestion });
  }

  return useMemo(
    () => ({
      methods,
      questionFields,
      isEdit,
      heading,
      isHydrating,
      isSubmitting,
      locked,
      responseCount,
      serverError,
      onSubmit: onSubmit as (e?: BaseSyntheticEvent) => void,
      onAddQuestion,
    }),
    [methods, questionFields, isEdit, heading, isHydrating, isSubmitting, locked, responseCount, serverError, onSubmit],
  );
}
```

Diffs vs. previous version:
- New imports: `useUpdateAdminPoll`, `useAdminPoll`, `PollFormContext`.
- New `context` parameter (default `'owner'`).
- `pollQuery` selected from `ownerPoll` vs `adminPoll` based on context (each receives `id` or `undefined`).
- `update` selected from `ownerUpdate` vs `adminUpdate`.
- Create mode (no `id`) always uses owner endpoint — `create` is the same regardless.

- [ ] **Step 3: Update `PollForm.tsx` to forward `context`**

Read the file. Find:

```tsx
export function PollForm({ id, onSuccess, onCancel }: PollFormProps) {
  const vm = usePollForm({ id, onSuccess });
```

Replace with:

```tsx
export function PollForm({ id, context, onSuccess, onCancel }: PollFormProps) {
  const vm = usePollForm({ id, context, onSuccess });
```

(Rest of the file unchanged.)

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/routes/dashboard/PollForm && \
git commit -m "$(cat <<'EOF'
feat(frontend): PollForm accepts context for admin edit mode

usePollForm gains a context: 'owner' | 'admin' parameter. Both the
read hook (usePoll vs useAdminPoll) and the update mutation
(useUpdatePoll vs useUpdateAdminPoll) are selected based on context.
Create mode always uses the owner endpoint. PollForm forwards the
prop. No call sites pass context yet — that lands in the modal task.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Modals + routes (final task)

**Files:**
- Modify: `frontend/src/layouts/DashboardShell/modals/PollFormModal/types.ts`
- Modify: `frontend/src/layouts/DashboardShell/modals/PollFormModal/PollFormModal.tsx`
- Modify: `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/types.ts`
- Modify: `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/hooks/useAnalyticsModal.ts`
- Modify: `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/AnalyticsModal.tsx`
- Modify: `frontend/src/layouts/DashboardShell/DashboardShell.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Add `context` to PollFormModal types**

Replace `frontend/src/layouts/DashboardShell/modals/PollFormModal/types.ts` with:

```ts
export type PollFormModalMode = 'create' | 'edit';
export type PollFormModalContext = 'owner' | 'admin';

export interface PollFormModalProps {
  mode: PollFormModalMode;
  context?: PollFormModalContext;
  id?: string;
}
```

- [ ] **Step 2: Replace `PollFormModal.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { PollForm } from '../../../../routes/dashboard/PollForm';
import type { PollFormModalProps } from './types';

export function PollFormModal({ mode, context = 'owner', id }: PollFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={mode === 'edit' ? 'Edit poll' : 'New poll'}
      subtitle={mode === 'edit' ? undefined : 'Build your poll and publish when ready.'}
    >
      <PollForm id={id} context={context} onSuccess={close} onCancel={close} />
    </Modal>
  );
}
```

Diff vs. previous: accept `context` (default `'owner'`); thread to `PollForm`; close target depends on context.

- [ ] **Step 3: Add `context` to AnalyticsModal types**

Replace `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/types.ts` with:

```ts
export type AnalyticsModalContext = 'owner' | 'admin';

export interface AnalyticsModalProps {
  id: string;
  context?: AnalyticsModalContext;
}
```

- [ ] **Step 4: Update `useAnalyticsModal.ts` to accept context**

Replace `frontend/src/layouts/DashboardShell/modals/AnalyticsModal/hooks/useAnalyticsModal.ts` with:

```ts
import { usePollAnalytics } from '../../../../../api/queries/analytics';
import { usePoll } from '../../../../../api/queries/polls';
import { useAdminPoll, useAdminPollAnalytics } from '../../../../../api/queries/admin';
import type { AnalyticsModalContext } from '../types';

export function useAnalyticsModal(id: string, context: AnalyticsModalContext = 'owner') {
  const isAdmin = context === 'admin';

  const ownerAnalytics = usePollAnalytics(isAdmin ? undefined : id);
  const adminAnalytics = useAdminPollAnalytics(isAdmin ? id : undefined);
  const analytics = isAdmin ? adminAnalytics : ownerAnalytics;

  const ownerPoll = usePoll(isAdmin ? undefined : id);
  const adminPoll = useAdminPoll(isAdmin ? id : undefined);
  const pollDetails = isAdmin ? adminPoll : ownerPoll;

  return {
    isLoading: analytics.isLoading || pollDetails.isLoading,
    isError: analytics.isError || pollDetails.isError,
    analytics: analytics.data,
    poll: pollDetails.data,
  };
}
```

Diff vs. previous: hooks for analytics and poll details are now selected by context.

- [ ] **Step 5: Update `AnalyticsModal.tsx` to thread context**

Read the file. Replace its full contents with:

```tsx
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Spinner } from '../../../../components/primitives/Spinner';
import { AnalyticsView } from '../../../../components/analytics/AnalyticsView';
import { useAnalyticsModal } from './hooks/useAnalyticsModal';
import type { AnalyticsModalProps } from './types';

export function AnalyticsModal({ id, context = 'owner' }: AnalyticsModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');
  const vm = useAnalyticsModal(id, context);

  const subtitle = vm.poll ? (
    <span>For <b>{vm.poll.title}</b> · /{vm.poll.slug}</span>
  ) : undefined;

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Analytics"
      subtitle={subtitle}
      footer={
        <>
          <span className="text-sm text-gray-500 mr-auto">
            {vm.analytics ? `${vm.analytics.totalResponses} responses` : ''}
          </span>
          <Button variant="secondary" onClick={() => toast.message('Export CSV — coming soon')}>Export CSV</Button>
          <Button onClick={close}>Done</Button>
        </>
      }
    >
      {vm.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : vm.isError || !vm.analytics ? (
        <p className="text-sm text-red-600 py-12 text-center">Could not load analytics.</p>
      ) : (
        <AnalyticsView analytics={vm.analytics} />
      )}
    </Modal>
  );
}
```

Diff vs. previous: accept `context`, pass to hook, close target depends on context.

- [ ] **Step 6: Update `DashboardShell.tsx` — add 2 admin `useMatch` checks + render**

Replace `frontend/src/layouts/DashboardShell/DashboardShell.tsx` with:

```tsx
import { Outlet, useMatch } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarSearchProvider } from './SidebarSearchContext';
import { PollFormModal } from './modals/PollFormModal';
import { AnalyticsModal } from './modals/AnalyticsModal';

export function DashboardShell() {
  const newMatch = useMatch('/dashboard/polls/new');
  const editMatch = useMatch('/dashboard/polls/:id/edit');
  const analyticsMatch = useMatch('/dashboard/polls/:id/analytics');
  const adminEditMatch = useMatch('/dashboard/all-polls/:id/edit');
  const adminAnalyticsMatch = useMatch('/dashboard/all-polls/:id/analytics');

  return (
    <SidebarSearchProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      {newMatch && <PollFormModal mode="create" />}
      {editMatch && <PollFormModal mode="edit" id={editMatch.params.id!} />}
      {analyticsMatch && <AnalyticsModal id={analyticsMatch.params.id!} />}
      {adminEditMatch && <PollFormModal mode="edit" context="admin" id={adminEditMatch.params.id!} />}
      {adminAnalyticsMatch && <AnalyticsModal id={adminAnalyticsMatch.params.id!} context="admin" />}
    </SidebarSearchProvider>
  );
}
```

Diff vs. previous: 2 new `useMatch` calls and 2 new conditional modal renders with `context="admin"`.

- [ ] **Step 7: Add 2 new routes to `router.tsx`**

Read the file. Find the `/dashboard` route's `children` array. Add 2 new entries directly after the existing `'polls/:id/analytics'` entry. After the edit the children should look like:

```tsx
    children: [
      { index: true, element: <MyPollsTab /> },
      { path: 'all-users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
      { path: 'all-polls', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'polls/new', element: <MyPollsTab /> },
      { path: 'polls/:id/edit', element: <MyPollsTab /> },
      { path: 'polls/:id/analytics', element: <MyPollsTab /> },
      { path: 'all-polls/:id/edit', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
      { path: 'all-polls/:id/analytics', element: <RequireAdmin><AllPollsTab /></RequireAdmin> },
    ],
```

The new routes' elements are `<AllPollsTab />` (the admin background) wrapped in `<RequireAdmin>` (so a non-admin who tries the URL is redirected). The modal overlay is rendered separately by `DashboardShell`'s `useMatch`.

Don't change anything else in the router.

- [ ] **Step 8: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/layouts/DashboardShell/modals/PollFormModal \
        frontend/src/layouts/DashboardShell/modals/AnalyticsModal \
        frontend/src/layouts/DashboardShell/DashboardShell.tsx \
        frontend/src/router.tsx && \
git commit -m "$(cat <<'EOF'
feat(frontend): admin context for modals + admin polls routes

PollFormModal and AnalyticsModal accept a context: 'owner' | 'admin'
prop and thread it to their inner form/hook. Close target also picks
'/dashboard' vs '/dashboard/all-polls'. DashboardShell adds two
useMatch checks for /dashboard/all-polls/:id/{edit,analytics} and
renders the modal with context='admin'. Router has the two new
RequireAdmin-gated routes; their element is AllPollsTab so the
background table is visible behind the modal.

Spec: docs/superpowers/specs/2026-05-28-admin-polls-mutations-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Then `git log -1 --stat` to confirm.

---

## Self-review notes

- **Spec coverage:**
  - 5 backend endpoints → Tasks 1+2.
  - 2 new query hooks → Task 3.
  - 3 new mutation hooks → Task 3.
  - AdminPollsTable + AllPollsTab context wiring → Task 4.
  - PollForm context → Task 5.
  - PollFormModal + AnalyticsModal + DashboardShell + router → Task 6.
  - Close-modal navigation per context → Task 6 (PollFormModal.tsx, AnalyticsModal.tsx).
  - Cache invalidation on admin mutations → Task 3.

- **Placeholder scan:** No "TBD", "add appropriate error handling", or "similar to Task N". All code blocks are complete.

- **Type consistency:**
  - `AdminPollsTableContext`, `PollFormContext`, `PollFormModalContext`, `AnalyticsModalContext` all share the same `'owner' | 'admin'` shape. (Could be deduped into one shared type, but per-component re-export keeps the API cohesive.)
  - `useUpdateAdminPoll(id: string)`, `useDeleteAdminPoll()`, `useAdminToggleActive()` — signatures match call sites in Tasks 4–6.
  - `useAdminPoll(id: string | undefined)` and `useAdminPollAnalytics(id: string | undefined)` — `enabled: !!id` gating consistent with their owner counterparts.

- **Route element choice for admin modal routes:** `<AllPollsTab />` (wrapped in `<RequireAdmin>`) as the background. The modal overlay is rendered by `DashboardShell`'s `useMatch`. If `DashboardShell` didn't match, the URL would still render `AllPollsTab` standalone — no broken state.

- **Backend gen-api dependency:** Task 2 Step 3 requires the backend to compile. If Step 1 introduces a syntax error, gen-api will fail with a clear NestJS bootstrap error. Fix backend code first.
