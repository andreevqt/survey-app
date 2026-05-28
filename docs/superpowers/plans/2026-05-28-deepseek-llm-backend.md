# DeepSeek backend for free-text analysis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `DEEPSEEK_API_KEY` is set in the backend env, route the free-text analytics analyzer through DeepSeek's OpenAI-compatible chat-completions API; otherwise keep the existing deterministic mock.

**Architecture:** One private helper `deepseekAnalyzeAnswers(questionText, answers)` is added to `backend/src/analytics/analytics.service.ts` alongside the existing `mockAnalyzeAnswers`. `AnalyticsService.analyzeFreeTextQuestion` dispatches between them by reading `process.env.DEEPSEEK_API_KEY` per call. A runtime validator coerces the model's JSON into the existing `AiAnalysisDto`. The DTO, the OpenAPI contract, and the frontend are unchanged.

**Tech Stack:** NestJS (`BadGatewayException`), built-in Node `fetch` + `AbortSignal.timeout`, Jest (with `jest.spyOn(global, 'fetch')`).

**Spec:** [docs/superpowers/specs/2026-05-28-deepseek-llm-backend-design.md](../specs/2026-05-28-deepseek-llm-backend-design.md)

**Workflow note:** Project convention: code first, tests after. No Red/Green/Refactor cadence.

---

### Task 1: Add DeepSeek helper + router in `AnalyticsService`

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts`

- [ ] **Step 1: Update imports**

In [`backend/src/analytics/analytics.service.ts`](../../../backend/src/analytics/analytics.service.ts), change the top imports to include `BadGatewayException`:

```ts
import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

(`AiAnalysisDto`, `SentimentDto`, `ThemeDto` are already imported.)

- [ ] **Step 2: Route through the new helper**

Inside `AnalyticsService.analyzeFreeTextQuestion`, replace the final return line:

```ts
    return mockAnalyzeAnswers(answers);
```

with:

```ts
    return process.env.DEEPSEEK_API_KEY
      ? deepseekAnalyzeAnswers(question.text, answers)
      : mockAnalyzeAnswers(answers);
```

The `question` object already has `id` and `type` selected; add `text` to the select so it's available here:

```ts
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, pollId },
      select: { id: true, type: true, text: true },
    });
```

- [ ] **Step 3: Append the DeepSeek helper + validator**

At the bottom of the file (after `mockAnalyzeAnswers`), append the following block. Keep the existing `// --- Mock LLM analysis ---` comment block above it; add a parallel marker for the real provider:

```ts
// --- DeepSeek provider ----------------------------------------------------
// Called when DEEPSEEK_API_KEY is set. OpenAI-compatible chat-completions
// shape, JSON-mode response, 30s timeout. Errors surface as BadGateway so
// the existing frontend hook renders its red error panel.
// --------------------------------------------------------------------------

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_TIMEOUT_MS = 30_000;

function buildDeepseekPrompt(questionText: string, answers: string[]): string {
  const numbered = answers.length
    ? answers.map((a, i) => `${i + 1}. ${a}`).join('\n')
    : '(no responses)';
  return `Return STRICT JSON of the shape:
{
  "summary": string (1-2 sentences),
  "sentiment": { "positive": number, "neutral": number, "negative": number } (integer percentages, sum 100),
  "themes": [ { "label": string, "count": number, "quote": string } ] (3-5 themes; quote is a short verbatim from the input, ≤ 140 chars)
}
Do not include any prose outside the JSON. Do not wrap in markdown fences.

Question: ${questionText}

Responses:
${numbered}`;
}

function coerceInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function coerceAiAnalysis(raw: unknown): AiAnalysisDto {
  if (!raw || typeof raw !== 'object') {
    throw new Error('schema: not an object');
  }
  const r = raw as Record<string, unknown>;
  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) throw new Error('schema: missing summary');

  const sentRaw = (r.sentiment ?? {}) as Record<string, unknown>;
  let positive = Math.max(0, coerceInt(sentRaw.positive, 0));
  let negative = Math.max(0, coerceInt(sentRaw.negative, 0));
  let neutral = Math.max(0, coerceInt(sentRaw.neutral, 0));
  const sum = positive + neutral + negative;
  if (sum !== 100) {
    const drift = 100 - sum;
    neutral = Math.max(0, neutral + drift);
    const total = positive + neutral + negative;
    if (total === 0) {
      neutral = 100;
    } else if (total !== 100) {
      // Final clamp: rescale proportionally.
      const k = 100 / total;
      positive = Math.round(positive * k);
      negative = Math.round(negative * k);
      neutral = 100 - positive - negative;
      if (neutral < 0) neutral = 0;
    }
  }
  const sentiment: SentimentDto = { positive, neutral, negative };

  const themesRaw = Array.isArray(r.themes) ? r.themes : [];
  const themes: ThemeDto[] = themesRaw
    .slice(0, 5)
    .map((t) => {
      const obj = (t ?? {}) as Record<string, unknown>;
      const label = typeof obj.label === 'string' ? obj.label.trim() : '';
      const count = Math.max(1, coerceInt(obj.count, 1));
      const quote = typeof obj.quote === 'string' ? obj.quote.trim() : '';
      return { label, count, quote };
    })
    .filter((t) => t.label.length > 0);

  return { summary, sentiment, themes };
}

async function deepseekAnalyzeAnswers(
  questionText: string,
  answers: string[],
): Promise<AiAnalysisDto> {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You analyze open-text survey responses. Respond with strict JSON only — no prose, no markdown fences.',
      },
      { role: 'user', content: buildDeepseekPrompt(questionText, answers) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  };

  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    });
  } catch (e) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek request failed: ${(e as Error).message}`,
    });
  }

  if (!response.ok) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek returned HTTP ${response.status}`,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek returned a non-JSON body',
    });
  }

  const content = (payload as any)?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek response missing choices[0].message.content',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek content is not valid JSON',
    });
  }

  try {
    return coerceAiAnalysis(parsed);
  } catch (e) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek schema mismatch: ${(e as Error).message}`,
    });
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npm --workspace backend run check:ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/analytics/analytics.service.ts
git commit -m "feat(backend): deepseek provider for free-text analysis"
```

---

### Task 2: `.env.example` + `CLAUDE.md`

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the env keys**

Open [`.env.example`](../../../.env.example) and append at the bottom of the `# Backend` block (before the blank line that separates Frontend):

```
# AI provider for free-text analytics. Leave blank to use the built-in mock.
DEEPSEEK_API_KEY=
# Optional model override; defaults to deepseek-chat.
# DEEPSEEK_MODEL=deepseek-chat
```

- [ ] **Step 2: Note the gotcha in CLAUDE.md**

Open [`CLAUDE.md`](../../../CLAUDE.md). In the `## Gotchas` list (the bullet list near the bottom), add a new bullet (place it after the "Role mutations invalidate refresh tokens" bullet so it stays grouped with the other env-/backend-level notes):

```markdown
- **Free-text analytics provider** — `POST /polls/:pollId/questions/:questionId/analyze` calls DeepSeek (`https://api.deepseek.com`) when `DEEPSEEK_API_KEY` is set; with the key unset (CI, fresh clones), it falls back to a deterministic mock so the UI still renders something sensible. Optional `DEEPSEEK_MODEL` overrides `deepseek-chat`. Provider errors surface as `502 AI_PROVIDER_ERROR` and the frontend shows the red error panel.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: document DEEPSEEK_API_KEY for free-text analysis"
```

---

### Task 3: Backend tests for the DeepSeek branch

**Files:**
- Modify: `backend/src/analytics/analytics.service.spec.ts`

- [ ] **Step 1: Append a new `describe` block at the end of the file**

Open [`backend/src/analytics/analytics.service.spec.ts`](../../../backend/src/analytics/analytics.service.spec.ts) and append:

```ts
describe('AnalyticsService.analyzeFreeTextQuestion · DeepSeek branch', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;
  let fetchSpy: jest.SpyInstance;
  const originalKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);

    prisma.poll.findFirst.mockResolvedValue({ id: 'p1' } as any);
    prisma.question.findFirst.mockResolvedValue({
      id: 'q1',
      type: QuestionType.TEXT,
      text: 'How was it?',
    } as any);
    prisma.answer.findMany.mockResolvedValue([
      { textValue: 'It was great, support was helpful' },
      { textValue: 'Pricing was confusing' },
    ] as any);

    process.env.DEEPSEEK_API_KEY = 'test-key';
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalKey;
  });

  function jsonResponse(status: number, body: unknown): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }

  it('returns a coerced DTO on a well-formed DeepSeek reply', async () => {
    const content = JSON.stringify({
      summary: 'Mostly positive about support.',
      sentiment: { positive: 60, neutral: 30, negative: 10 },
      themes: [
        { label: 'support', count: 2, quote: 'support was helpful' },
        { label: 'pricing', count: 1, quote: 'Pricing was confusing' },
      ],
    });
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { choices: [{ message: { content } }] }),
    );

    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.summary).toMatch(/support/i);
    expect(out.sentiment).toEqual({ positive: 60, neutral: 30, negative: 10 });
    expect(out.themes).toHaveLength(2);
    expect(out.themes[0].label).toBe('support');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-key',
    });
  });

  it('normalises sentiment that does not sum to 100', async () => {
    const content = JSON.stringify({
      summary: 'Drifty numbers.',
      sentiment: { positive: 40, neutral: 40, negative: 30 }, // sums to 110
      themes: [],
    });
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { choices: [{ message: { content } }] }),
    );

    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.sentiment.positive + out.sentiment.neutral + out.sentiment.negative).toBe(100);
  });

  it('throws BadGateway when DeepSeek returns HTTP 500', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }));
    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/HTTP 500/);
  });

  it('throws BadGateway when message.content is not valid JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { choices: [{ message: { content: 'not json {' } }] }),
    );
    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/not valid JSON/);
  });

  it('throws BadGateway when the parsed JSON misses `summary`', async () => {
    const content = JSON.stringify({ sentiment: { positive: 0, neutral: 100, negative: 0 }, themes: [] });
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { choices: [{ message: { content } }] }),
    );
    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/schema mismatch/);
  });

  it('falls back to the mock when DEEPSEEK_API_KEY is unset', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(fetchSpy).not.toHaveBeenCalled();
    // Mock branch returns a deterministic 1-sentence summary derived from the answers.
    expect(out.summary).toMatch(/responses?/i);
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `npm --workspace backend test -- src/analytics/analytics.service.spec.ts`
Expected: all 14 tests pass (8 existing + 6 new).

- [ ] **Step 3: Commit**

```bash
git add backend/src/analytics/analytics.service.spec.ts
git commit -m "test(backend): cover deepseek branch of analyzeFreeTextQuestion"
```

---

### Task 4: Manual verification

**Files:** none (manual)

- [ ] **Step 1: Verify mock path still works (no key)**

Make sure `DEEPSEEK_API_KEY` is unset in your env, restart `npm run dev`, and click **Analyze with AI** on a poll with a free-text question + responses. Confirm the panel renders summary/sentiment/themes from the deterministic mock (same as before this PR).

- [ ] **Step 2: Verify DeepSeek path (with a real key)**

Set `DEEPSEEK_API_KEY=<your-key>` in the shell env, restart `npm run dev`, click **Analyze with AI** again on the same poll. The summary text should be qualitatively different (real model output), and the network tab should show a `POST /api/v1/polls/:pollId/questions/:questionId/analyze` → 200 with the structured DTO.

- [ ] **Step 3: Verify error path**

Set `DEEPSEEK_API_KEY=obviously-wrong-key` and click again. The button should briefly show its loading state, then the red error panel ("Could not analyze responses. Try again.") should appear. Backend logs should show a `BadGatewayException` with `AI_PROVIDER_ERROR`.

- [ ] **Step 4: Full repo check**

Run: `npm run check:ts && npm test`
Expected: all green.
