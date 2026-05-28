# "Analyze with AI" button — design

**Date:** 2026-05-28
**Scope:** Backend (1 new endpoint + DTO + service method, mock implementation) + frontend (extend `QuestionAnalyticsCard` with an "Analyze with AI" button and result panel for `TEXT` questions). Regen the OpenAPI schema.

## Problem

The canonical design ([`design/Polls App.html:3026-3158`](../../../design/Polls%20App.html)) renders free-text question cards in the analytics view with an **Analyze with AI** button. Clicking it shows an indigo-gradient panel containing a one-sentence summary, a segmented sentiment bar (positive / neutral / negative), and 3–5 themes (label + count badge + verbatim quote).

The current `QuestionAnalyticsCard` ([`frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx`](../../../frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx)) renders a placeholder line ("N text responses recorded") for `TEXT` questions — no button, no analysis. There is also no backend endpoint that can produce the analysis.

## Goal

Ship the **Analyze with AI** affordance end-to-end with a mocked LLM so the UX, types, and contract are real. Swapping in a real provider later is a one-file change inside the service.

## Non-goals (deferred)

- Real LLM provider integration (Anthropic / OpenAI / BYOK). The service returns a deterministic mock derived from the answers.
- Persisting analyses across requests. Each click recomputes; no DB column, no cache.
- Exposing raw text answers via the API. The backend reads them internally; the frontend never sees them.
- Rendering the "Recent responses" list with verbatim answers ("Show all N" button) — separate task, would require exposing answers in the analytics response.
- Rate-limiting, billing hooks, prompt logging.
- Admin-scoped analyze endpoint (mirrors `/admin/polls/:id/analytics`). Owner-only for now.

## Design

### Backend

**New endpoint:** `POST /api/v1/polls/:pollId/questions/:questionId/analyze`, owner-scoped (same auth pattern as `GET /polls/:id/analytics`). Returns `200` with `AiAnalysisDto` on success.

- `404 POLL_NOT_FOUND` if poll doesn't exist or isn't owned by the caller (same shape as existing owner analytics).
- `404 QUESTION_NOT_FOUND` if the question doesn't belong to that poll.
- `400 QUESTION_NOT_TEXT` if the question's type isn't `TEXT`.

**New DTO** in [`backend/src/analytics/dto/`](../../../backend/src/analytics/dto/) — file `ai-analysis.dto.ts`:

```ts
export class SentimentDto {
  positive!: number;  // 0–100 integer
  neutral!: number;   // 0–100 integer
  negative!: number;  // 0–100 integer, sums to 100 with the others
}

export class ThemeDto {
  label!: string;     // e.g. "pricing"
  count!: number;     // occurrences across answers
  quote!: string;     // a verbatim answer fragment, ≤ 140 chars
}

export class AiAnalysisDto {
  summary!: string;             // one sentence
  sentiment!: SentimentDto;
  themes!: ThemeDto[];          // 0–5 items
}
```

All classes get `@ApiProperty` decorators so they land in `openapi.json`.

**New service method:** `AnalyticsService.analyzeFreeTextQuestion(userId: string, pollId: string, questionId: string): Promise<AiAnalysisDto>`.

Flow:
1. Verify the poll exists and belongs to `userId` (reuse the same `findFirst` pattern as `getOwnerAnalytics`).
2. Load the question by id, scoped to that poll. Reject if not found or not `TEXT`.
3. Load that question's `answers` (the `Answer.value` strings).
4. Build the mock analysis from the answers (see "Mock heuristic" below).
5. Return the DTO.

**Mock heuristic** — lives as a private helper inside `analytics.service.ts` so the swap-in point is obvious:

- **Sentiment:** scan each answer against a small built-in lexicon. Positive words: `good, great, love, easy, awesome, helpful, fast, nice, perfect, useful`. Negative words: `bad, hate, slow, broken, confusing, terrible, hard, annoying, missing, useless`. Per answer: positive if it has any positive word and no negative word, negative if it has any negative word and no positive word, neutral otherwise. Convert counts to percentages, round, fix rounding drift on `positive` so the three sum to exactly 100. If there are zero answers, return `{ positive: 0, neutral: 100, negative: 0 }`.
- **Themes:** lowercase + tokenize on `/[^\p{L}\p{N}]+/u`, drop stopwords (a small built-in set: `the, a, an, and, or, but, of, in, on, at, to, for, with, is, it, this, that, was, are, be, have, has, i, you, we, they, my, your`), drop tokens shorter than 3 chars, count frequency, take top 5 with `count >= 2`. For each, `quote` is the first answer containing that token, trimmed to ≤ 140 chars with an ellipsis. If fewer than 2 themes meet the threshold, lower it to `count >= 1` until at least 3 themes emerge — or return what we have (could be empty).
- **Summary:** `"<N> responses, mostly about <theme1>, <theme2>, and <theme3>."` Falls back to `"<N> responses recorded."` if there are no themes, and `"No responses yet."` if `answers.length === 0`.

**Controller wiring:** add the route to `AnalyticsController`. No new guard — uses the same `JwtAuthGuard` that's globally applied.

**Tests:** one Jest spec next to `analytics.service.spec.ts` covering: empty answers → `{0, 100, 0}` sentiment + "No responses yet." summary; mixed answers → themes ordered by frequency, sentiment percentages sum to 100; non-TEXT question → throws.

### Frontend

**Update `QuestionAnalyticsCard.tsx`:** when `question.type === 'TEXT'`, render a row with the question title on the left and an "Analyze with AI" button on the right (use the existing `Button` primitive). When `analysis` is present, the button label flips to "Re-analyze" and its variant flips from `primary` to `secondary`. Sparkle SVG lives inline in the component file as a small `<SparkleIcon />` const.

Below the title row, conditionally render (in priority order):
- **Loading:** nothing extra; the `Button` already shows `isLoading`.
- **Error:** existing red panel styling (`bg-red-50 border-red-200 text-red-700`).
- **Analysis present:** the indigo gradient result panel from the design — "AI summary" label + sparkle, the summary sentence, sentiment bar with legend, themes list (each row: bold label + count `Badge` + italic quote).

Non-text question rendering stays exactly as it is today.

**New hook** at [`frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts`](../../../frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts):

```ts
export function useFreeTextAnalysis(pollId: string, questionId: string) {
  // returns { analysis, loading, error, analyze }
}
```

It calls the new endpoint via the shared `apiClient` from [`frontend/src/api/client.ts`](../../../frontend/src/api/client.ts) and uses generated types from `schema.ts`. The existing `useQuestionAnalyticsCard` hook stays as-is; the analysis state lives in this new hook so the card can compose both.

**Plumbing pollId down:** `QuestionAnalyticsCard` currently takes only `question`. Add a `pollId: string` prop; pass it from `AnalyticsView` (which already has the poll context).

**Schema regen:** run `npm run gen:api` after the backend lands so `frontend/src/api/schema.ts` includes the new endpoint and DTOs. Both files are committed to the PR.

### Styling notes

Match the design verbatim where possible — colors, padding, badge variants. The gradient panel uses `bg-gradient-to-b from-indigo-50 to-white` with `border-indigo-100`. Sentiment bar segment colors: `#10B981` (positive), `#9CA3AF` (neutral), `#EF4444` (negative).

## Out-of-scope reminders

- No new modal, no new route — everything is inside the existing analytics view.
- No router changes.
- No changes to the non-TEXT card path.
- No persistence; refreshing the modal clears the analysis.

## Testing

- Backend: Jest unit test for `analyzeFreeTextQuestion` covering the three scenarios listed above.
- Frontend: Vitest test for `useFreeTextAnalysis` (happy path + error). Component snapshot is intentionally not added — visual changes get verified by running the app.
- Manual check: open the analytics modal for a poll with at least one text question, click **Analyze with AI**, confirm the panel renders. Repeat with a poll that has zero text responses.
