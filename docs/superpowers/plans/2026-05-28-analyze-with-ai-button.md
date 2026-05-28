# Analyze-with-AI Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Analyze with AI" button to each free-text question card in the analytics view, backed by a mocked backend endpoint that produces a deterministic summary / sentiment / themes payload.

**Architecture:** New owner-scoped `POST /polls/:pollId/questions/:questionId/analyze` endpoint on `AnalyticsController`. `AnalyticsService.analyzeFreeTextQuestion` reads text answers from Prisma and fakes the analysis locally (small lexicon + token frequency). Frontend extends `QuestionAnalyticsCard` with a button + result panel, calling the endpoint through `apiClient` and isolating state in a new `useFreeTextAnalysis` hook.

**Tech Stack:** NestJS, Prisma, `class-validator` / `@nestjs/swagger`, Vite + React, `openapi-fetch`, generated `schema.ts` from `npm run gen:api`. Tailwind for styling.

**Spec:** [docs/superpowers/specs/2026-05-28-analyze-with-ai-button-design.md](../specs/2026-05-28-analyze-with-ai-button-design.md)

**Workflow note:** Per project conventions in this repo, tests are written AFTER the implementation lands, not before. No Red/Green/Refactor cadence.

---

### Task 1: Backend DTO

**Files:**
- Create: `backend/src/analytics/dto/ai-analysis.dto.ts`

- [ ] **Step 1: Create the DTO file**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class SentimentDto {
  @ApiProperty({ description: 'Percentage of positive answers (0-100, integer)' }) positive!: number;
  @ApiProperty({ description: 'Percentage of neutral answers (0-100, integer)' }) neutral!: number;
  @ApiProperty({ description: 'Percentage of negative answers (0-100, integer)' }) negative!: number;
}

export class ThemeDto {
  @ApiProperty({ description: 'Short theme label, lowercase token' }) label!: string;
  @ApiProperty({ description: 'Number of answers mentioning the theme' }) count!: number;
  @ApiProperty({ description: 'Verbatim answer fragment, ≤ 140 chars' }) quote!: string;
}

export class AiAnalysisDto {
  @ApiProperty({ description: 'One-sentence summary of the responses' }) summary!: string;
  @ApiProperty({ type: SentimentDto }) sentiment!: SentimentDto;
  @ApiProperty({ type: [ThemeDto], description: '0–5 themes ordered by frequency' }) themes!: ThemeDto[];
}
```

- [ ] **Step 2: Type-check**

Run: `npm --workspace backend run check:ts` (falls back to `npm run check:ts` from repo root)
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/dto/ai-analysis.dto.ts
git commit -m "feat(backend): add AiAnalysisDto for free-text analysis"
```

---

### Task 2: Backend service + controller

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts`
- Modify: `backend/src/analytics/analytics.controller.ts`

- [ ] **Step 1: Add the service method and mock helpers**

Append the following to [`backend/src/analytics/analytics.service.ts`](../../../backend/src/analytics/analytics.service.ts) (alongside the existing `getOwnerAnalytics` / `getAnalyticsById` / `getSystemAnalytics` methods). Add the `BadRequestException` import.

Update the top of the file:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiAnalysisDto, SentimentDto, ThemeDto } from './dto/ai-analysis.dto';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';
```

Add this method inside `AnalyticsService`, right before the closing `}`:

```ts
  async analyzeFreeTextQuestion(
    ownerId: string,
    pollId: string,
    questionId: string,
  ): Promise<AiAnalysisDto> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      select: { id: true },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, pollId },
      select: { id: true, type: true },
    });
    if (!question) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found' });
    if (question.type !== QuestionType.TEXT) {
      throw new BadRequestException({ code: 'QUESTION_NOT_TEXT', message: 'Question is not a free-text question' });
    }

    const rows = await this.prisma.answer.findMany({
      where: { questionId, textValue: { not: null } },
      select: { textValue: true },
    });
    const answers = rows
      .map((r) => r.textValue ?? '')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return mockAnalyzeAnswers(answers);
  }
```

Append the mock helpers at the bottom of the same file, outside the class:

```ts
// --- Mock LLM analysis -----------------------------------------------------
// Replace `mockAnalyzeAnswers` with a real provider call (e.g. Anthropic)
// when wiring up production AI. The returned shape MUST stay `AiAnalysisDto`.
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = new Set([
  'good', 'great', 'love', 'loved', 'easy', 'awesome', 'helpful',
  'fast', 'nice', 'perfect', 'useful', 'amazing', 'happy', 'best',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'hate', 'hated', 'slow', 'broken', 'confusing', 'terrible',
  'hard', 'annoying', 'missing', 'useless', 'worst', 'buggy', 'crash',
]);

const STOPWORDS = new Set([
  'the', 'and', 'but', 'with', 'for', 'this', 'that', 'have', 'has',
  'was', 'are', 'you', 'your', 'they', 'their', 'them', 'from',
  'just', 'will', 'would', 'could', 'should', 'about', 'what', 'when',
  'where', 'which', 'into', 'over', 'than', 'very', 'much', 'more',
  'some', 'also', 'because', 'been', 'were',
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function scoreSentiment(answers: string[]): SentimentDto {
  if (answers.length === 0) return { positive: 0, neutral: 100, negative: 0 };
  let pos = 0;
  let neg = 0;
  for (const answer of answers) {
    const tokens = new Set(tokenize(answer));
    const hasPos = [...tokens].some((t) => POSITIVE_WORDS.has(t));
    const hasNeg = [...tokens].some((t) => NEGATIVE_WORDS.has(t));
    if (hasPos && !hasNeg) pos += 1;
    else if (hasNeg && !hasPos) neg += 1;
  }
  const neu = answers.length - pos - neg;
  const positive = Math.round((pos / answers.length) * 100);
  const negative = Math.round((neg / answers.length) * 100);
  const neutral = Math.max(0, 100 - positive - negative);
  return { positive, neutral, negative };
}

function trimQuote(answer: string): string {
  const collapsed = answer.replace(/\s+/g, ' ').trim();
  return collapsed.length <= 140 ? collapsed : `${collapsed.slice(0, 137)}…`;
}

function buildThemes(answers: string[]): ThemeDto[] {
  if (answers.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of answers) {
    for (const token of new Set(tokenize(a))) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let selected = sorted.filter(([, c]) => c >= 2).slice(0, 5);
  if (selected.length < 3) selected = sorted.slice(0, 5);
  return selected.map(([label, count]) => {
    const carrier = answers.find((a) => tokenize(a).includes(label)) ?? '';
    return { label, count, quote: trimQuote(carrier) };
  });
}

function buildSummary(answers: string[], themes: ThemeDto[]): string {
  if (answers.length === 0) return 'No responses yet.';
  const noun = `${answers.length} response${answers.length === 1 ? '' : 's'}`;
  if (themes.length === 0) return `${noun} recorded.`;
  const labels = themes.slice(0, 3).map((t) => t.label);
  if (labels.length === 1) return `${noun}, mostly about ${labels[0]}.`;
  if (labels.length === 2) return `${noun}, mostly about ${labels[0]} and ${labels[1]}.`;
  return `${noun}, mostly about ${labels[0]}, ${labels[1]}, and ${labels[2]}.`;
}

function mockAnalyzeAnswers(answers: string[]): AiAnalysisDto {
  const sentiment = scoreSentiment(answers);
  const themes = buildThemes(answers);
  const summary = buildSummary(answers, themes);
  return { summary, sentiment, themes };
}
```

- [ ] **Step 2: Wire the controller route**

Edit [`backend/src/analytics/analytics.controller.ts`](../../../backend/src/analytics/analytics.controller.ts):

1. Add `Post` to the imports:

```ts
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
```

2. Add the DTO import:

```ts
import { AiAnalysisDto } from './dto/ai-analysis.dto';
```

3. Add the route inside the `AnalyticsController` class, after `getOwnerAnalytics`:

```ts
  @Post('polls/:pollId/questions/:questionId/analyze')
  @ApiOkResponse({ type: AiAnalysisDto })
  analyzeFreeTextQuestion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('pollId') pollId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.svc.analyzeFreeTextQuestion(user.id, pollId, questionId);
  }
```

- [ ] **Step 3: Type-check + lint**

Run: `npm --workspace backend run check:ts` and `npm --workspace backend run lint`
Expected: PASS for both.

- [ ] **Step 4: Commit**

```bash
git add backend/src/analytics/analytics.service.ts backend/src/analytics/analytics.controller.ts
git commit -m "feat(backend): mock analyze-free-text endpoint"
```

---

### Task 3: Regenerate the OpenAPI contract

**Files:**
- Modify: `openapi.json`
- Modify: `frontend/src/api/schema.ts`

- [ ] **Step 1: Run gen:api**

Run: `npm run gen:api`
Expected: PASS. The generator boots the Nest app, exports `openapi.json`, and overwrites `frontend/src/api/schema.ts`. Verify the new endpoint is in the diff:

```bash
grep -c "polls/{pollId}/questions/{questionId}/analyze" openapi.json
grep -c "AiAnalysisDto" frontend/src/api/schema.ts
```

Both grep counts should be ≥ 1.

- [ ] **Step 2: Commit**

```bash
git add openapi.json frontend/src/api/schema.ts
git commit -m "chore: regen openapi contract for analyze endpoint"
```

---

### Task 4: Frontend hook

**Files:**
- Create: `frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useCallback, useState } from 'react';
import { apiClient } from '../../../../api/client';
import type { components } from '../../../../api/schema';

export type AiAnalysis = components['schemas']['AiAnalysisDto'];

export interface FreeTextAnalysisViewModel {
  analysis: AiAnalysis | null;
  loading: boolean;
  error: string | null;
  analyze: () => Promise<void>;
}

export function useFreeTextAnalysis(pollId: string, questionId: string): FreeTextAnalysisViewModel {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await apiClient.POST(
      '/polls/{pollId}/questions/{questionId}/analyze',
      { params: { path: { pollId, questionId } } },
    );
    if (apiError || !data) {
      setError('Could not analyze responses. Try again.');
      setLoading(false);
      return;
    }
    setAnalysis(data as AiAnalysis);
    setLoading(false);
  }, [pollId, questionId]);

  return { analysis, loading, error, analyze };
}
```

- [ ] **Step 2: Type-check**

Run: `npm --workspace frontend run check:ts` (or `npm run check:ts` from repo root)
Expected: PASS. If the openapi-fetch path string doesn't auto-complete, double-check it against `frontend/src/api/schema.ts` — it should appear as a key under `paths`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts
git commit -m "feat(frontend): add useFreeTextAnalysis hook"
```

---

### Task 5: Frontend card + AnalyticsView wiring

**Files:**
- Modify: `frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx`
- Modify: `frontend/src/components/analytics/QuestionAnalyticsCard/types.ts`
- Modify: `frontend/src/components/analytics/AnalyticsView/AnalyticsView.tsx`

- [ ] **Step 1: Add `pollId` prop to the card's types**

Replace [`frontend/src/components/analytics/QuestionAnalyticsCard/types.ts`](../../../frontend/src/components/analytics/QuestionAnalyticsCard/types.ts) with:

```ts
import type { components } from '../../../api/schema';

export type QuestionAggregateQuestion = components['schemas']['QuestionAggregateDto'];

export interface QuestionAnalyticsCardProps {
  pollId: string;
  question: QuestionAggregateQuestion;
}
```

- [ ] **Step 2: Pass `pollId` from `AnalyticsView`**

Replace [`frontend/src/components/analytics/AnalyticsView/AnalyticsView.tsx`](../../../frontend/src/components/analytics/AnalyticsView/AnalyticsView.tsx) with:

```tsx
import { Card } from '../../primitives/Card';
import { QuestionAnalyticsCard } from '../QuestionAnalyticsCard';
import type { AnalyticsViewProps } from './types';

export function AnalyticsView({ analytics }: AnalyticsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-sm font-medium text-gray-500">Total responses</p>
        <p className="mt-1 text-4xl font-bold text-gray-900">{analytics.totalResponses}</p>
      </Card>
      <div className="flex flex-col gap-4">
        {analytics.questions.map((q) => (
          <QuestionAnalyticsCard key={q.questionId} pollId={analytics.pollId} question={q} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the card**

Replace [`frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx`](../../../frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx) with:

```tsx
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { Card } from '../../primitives/Card';
import { useFreeTextAnalysis } from './hooks/useFreeTextAnalysis';
import { useQuestionAnalyticsCard } from './hooks/useQuestionAnalyticsCard';
import type { QuestionAnalyticsCardProps } from './types';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <path d="M12 8a4 4 0 0 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  );
}

export function QuestionAnalyticsCard({ pollId, question }: QuestionAnalyticsCardProps) {
  const vm = useQuestionAnalyticsCard(question);
  const ai = useFreeTextAnalysis(pollId, question.questionId);

  if (!vm.isText) {
    return (
      <Card size="sm">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{question.text}</p>
          <p className="text-xs text-gray-500">
            {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
          </p>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {vm.rows.map((row) => (
            <li key={row.optionId}>
              <div className="flex items-baseline justify-between text-xs text-gray-600">
                <span>{row.text}</span>
                <span>{row.count} ({row.pct}%)</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-2 bg-indigo-600" style={{ width: `${row.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const s = ai.analysis?.sentiment;

  return (
    <Card size="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{question.text}</p>
          <p className="mt-1 text-xs text-gray-500">
            Free-text · {vm.textAnswerCount} response{vm.textAnswerCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          size="sm"
          variant={ai.analysis ? 'secondary' : 'primary'}
          onClick={() => { void ai.analyze(); }}
          isLoading={ai.loading}
          className="inline-flex items-center gap-1.5 shrink-0"
        >
          {!ai.loading && <SparkleIcon />}
          <span>{ai.analysis ? 'Re-analyze' : 'Analyze with AI'}</span>
        </Button>
      </div>

      {ai.analysis && s && (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-600"><SparkleIcon /></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              AI summary
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-800">{ai.analysis.summary}</p>

          <div className="mt-3">
            <p className="text-xs text-gray-500">Sentiment</p>
            <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-[#10B981]" style={{ width: `${s.positive}%` }} />
              <div className="h-full bg-[#9CA3AF]" style={{ width: `${s.neutral}%` }} />
              <div className="h-full bg-[#EF4444]" style={{ width: `${s.negative}%` }} />
            </div>
            <div className="mt-1.5 flex gap-3 text-xs text-gray-600">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#10B981]" />Positive {s.positive}%</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#9CA3AF]" />Neutral {s.neutral}%</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#EF4444]" />Negative {s.negative}%</span>
            </div>
          </div>

          {ai.analysis.themes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">Top themes</p>
              <ul className="mt-2 flex flex-col gap-2">
                {ai.analysis.themes.map((t) => (
                  <li key={t.label} className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                      <Badge variant="info">{t.count}</Badge>
                    </div>
                    {t.quote && (
                      <p className="mt-1.5 text-xs italic leading-relaxed text-gray-600">
                        “{t.quote}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {ai.error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {ai.error}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Type-check + lint**

Run: `npm --workspace frontend run check:ts` and `npm --workspace frontend run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/analytics/QuestionAnalyticsCard frontend/src/components/analytics/AnalyticsView/AnalyticsView.tsx
git commit -m "feat(frontend): analyze-with-ai button on free-text cards"
```

---

### Task 6: Backend tests

**Files:**
- Modify: `backend/src/analytics/analytics.service.spec.ts`

- [ ] **Step 1: Inspect the existing spec to follow its style**

Run: `head -60 backend/src/analytics/analytics.service.spec.ts`
The existing spec mocks `PrismaService`; reuse the same harness. If the file uses a `prisma: any` factory, add one for `answer.findMany` and `poll.findFirst` / `question.findFirst`.

- [ ] **Step 2: Add tests for `analyzeFreeTextQuestion`**

Append three `describe`/`it` blocks to the file:

```ts
describe('analyzeFreeTextQuestion', () => {
  it('returns neutral 100% with "No responses yet." when there are no answers', async () => {
    const prisma: any = {
      poll: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      question: { findFirst: jest.fn().mockResolvedValue({ id: 'q1', type: 'TEXT' }) },
      answer: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new AnalyticsService(prisma);
    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.sentiment).toEqual({ positive: 0, neutral: 100, negative: 0 });
    expect(out.summary).toBe('No responses yet.');
    expect(out.themes).toEqual([]);
  });

  it('builds themes ordered by frequency and sentiment summing to 100', async () => {
    const prisma: any = {
      poll: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      question: { findFirst: jest.fn().mockResolvedValue({ id: 'q1', type: 'TEXT' }) },
      answer: {
        findMany: jest.fn().mockResolvedValue([
          { textValue: 'The pricing is great and the support is helpful' },
          { textValue: 'Pricing is too high but support is amazing' },
          { textValue: 'Confusing pricing page, otherwise fine' },
        ]),
      },
    };
    const svc = new AnalyticsService(prisma);
    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.sentiment.positive + out.sentiment.neutral + out.sentiment.negative).toBe(100);
    expect(out.themes[0].label).toBe('pricing');
    expect(out.themes[0].count).toBe(3);
    expect(out.summary.startsWith('3 responses')).toBe(true);
  });

  it('throws BadRequestException when the question is not TEXT', async () => {
    const prisma: any = {
      poll: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      question: { findFirst: jest.fn().mockResolvedValue({ id: 'q1', type: 'SINGLE_CHOICE' }) },
      answer: { findMany: jest.fn() },
    };
    const svc = new AnalyticsService(prisma);
    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/free-text/);
  });
});
```

If `BadRequestException` isn't already imported in the spec, add it to the imports.

- [ ] **Step 3: Run the new tests**

Run: `npm --workspace backend test -- src/analytics/analytics.service.spec.ts`
Expected: all three new cases PASS, plus the pre-existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/analytics/analytics.service.spec.ts
git commit -m "test(backend): cover analyzeFreeTextQuestion"
```

---

### Task 7: Frontend hook test

**Files:**
- Create: `frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../api/client';
import { useFreeTextAnalysis } from './useFreeTextAnalysis';

vi.mock('../../../../api/client', () => ({
  apiClient: { POST: vi.fn() },
}));

const postMock = apiClient.POST as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  postMock.mockReset();
});

describe('useFreeTextAnalysis', () => {
  it('stores the analysis returned by the API', async () => {
    const payload = {
      summary: '1 response recorded.',
      sentiment: { positive: 100, neutral: 0, negative: 0 },
      themes: [],
    };
    postMock.mockResolvedValueOnce({ data: payload, error: undefined });

    const { result } = renderHook(() => useFreeTextAnalysis('p1', 'q1'));
    await act(async () => { await result.current.analyze(); });

    expect(result.current.analysis).toEqual(payload);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets an error message on failure', async () => {
    postMock.mockResolvedValueOnce({ data: undefined, error: { code: 'BOOM' } });

    const { result } = renderHook(() => useFreeTextAnalysis('p1', 'q1'));
    await act(async () => { await result.current.analyze(); });

    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toMatch(/try again/i);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm --workspace frontend test -- src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis`
Expected: both cases PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.test.tsx
git commit -m "test(frontend): cover useFreeTextAnalysis"
```

---

### Task 8: Manual verification

**Files:** none (manual)

- [ ] **Step 1: Start the dev stack**

Run: `npm run dev` (backend on `:3000`, frontend on `:5173`).
Ensure Postgres is running (see project README; compose stack uses host port 5433).

- [ ] **Step 2: Exercise the flow**

1. Log in as a user that owns a poll with at least one free-text (TEXT) question with ≥ 1 submitted answer.
2. Open the analytics modal for that poll (`/dashboard/polls/:id/analytics`).
3. Confirm the free-text card shows the **Analyze with AI** button.
4. Click it. The button should show its loading state, then flip to **Re-analyze** (secondary variant) and reveal the indigo gradient panel with summary, sentiment bar, and themes.
5. Open analytics for a poll where the TEXT question has zero answers. Click **Analyze with AI** → the panel should show `"No responses yet."`, sentiment 0/100/0, and no themes.
6. Confirm non-text question cards render unchanged.

- [ ] **Step 3: Final repo check**

Run: `npm run check:ts && npm run lint && npm test`
Expected: all green.

- [ ] **Step 4: (Optional) push the branch**

Only run if the user asks to push / open a PR.
