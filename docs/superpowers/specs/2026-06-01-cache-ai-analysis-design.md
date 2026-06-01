# Cache AI free-text analysis — design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Goal

Stop re-calling DeepSeek on every "Analyze with AI" click. Persist the AI result
per free-text question and serve it back instantly; only spend a real LLM call
when the user explicitly regenerates or when the answer set has changed.

Today `POST /polls/:pollId/questions/:questionId/analyze`
([analytics.service.ts](../../../backend/src/analytics/analytics.service.ts)
`analyzeFreeTextQuestion`) re-fetches all answers and calls the provider every
time, with no persistence. The frontend
([useFreeTextAnalysis.ts](../../../frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts))
only calls it on a button click and keeps the result in local state.

## Decisions (from brainstorming)

- **Storage:** a Postgres table (survives backend container redeploys).
- **Invalidation:** by free-text **answer count** at generation time — answers are
  append-only in this app (no answer-edit UI), so count is a sound staleness signal.
- **UX:** auto-load the cached result when analytics opens (no LLM call); the button
  regenerates. Stale results are shown, flagged — not hidden.
- **Mock results are never cached.** Only real-provider results are persisted, tagged
  with the model. A no-key/CI environment therefore never serves mock data as cached.

## Data model

New 1:1 table in [schema.prisma](../../../backend/prisma/schema.prisma):

```prisma
model QuestionAnalysis {
  questionId  String   @id
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  result      Json     // AiAnalysisDto: { summary, sentiment, themes }
  answerCount Int      // free-text answer count when generated (staleness check)
  model       String   // provider model, e.g. "deepseek-chat" (mock never written)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Add the back-relation `analysis QuestionAnalysis?` to `model Question`.
`questionId` as PK enables `upsert` keyed by question; `onDelete: Cascade` removes
the cache row when the question is deleted. Requires a Prisma migration
(`npm run db:migrate` locally generates it; deploy runs `prisma migrate deploy`).

## Backend

### Service — split "fetch answers" from "generate", add cache read

In `AnalyticsService`:

- Extract a private helper that loads the question (with ownership + TEXT-type
  checks, as today) and returns the cleaned free-text answers array. Both the GET
  and POST paths use it so the count is computed identically.

- **`getQuestionAnalysis(ownerId, pollId, questionId): Promise<CachedAiAnalysisDto | null>`**
  - Verify poll ownership and question is TEXT (same `NOT_FOUND` / `QUESTION_NOT_TEXT`
    errors as the POST path).
  - Load the `QuestionAnalysis` row. If none → return `null`.
  - Compute current free-text answer count.
  - Return `{ ...result, generatedAt: row.updatedAt, stale: row.answerCount !== currentCount }`
    (uses `updatedAt` so re-analysis refreshes the timestamp, not first-generation time).

- **`analyzeFreeTextQuestion(...)`** (existing): unchanged generation logic. **Change:**
  after a successful **real-provider** call, `upsert` the row
  (`result`, `answerCount = currentCount`, `model`). The **mock path returns its
  result but does NOT persist.** Determine "real vs mock" the same way generation is
  chosen today (`process.env.DEEPSEEK_API_KEY` present).

### API — add GET, keep POST

- **`GET /polls/:pollId/questions/:questionId/analysis`** → `200` with
  `CachedAiAnalysisDto` when a row exists, or `200` with a JSON `null` body when not.
  (Chosen over `204` so the `openapi-fetch` client gets a typed nullable body; the
  frontend treats `null` as "nothing cached".) The handler return type is
  `CachedAiAnalysisDto | null`; annotate Swagger so the schema reflects the nullable.
- **`POST /polls/:pollId/questions/:questionId/analyze`** — unchanged request/response
  contract (`AiAnalysisDto`); now also caches on real-provider success.
- New DTO `CachedAiAnalysisDto extends AiAnalysisDto` adding
  `generatedAt: string (date-time)` and `stale: boolean`.
- Run **`npm run gen:api`** after the controller/DTO change.

## Frontend

[useFreeTextAnalysis.ts](../../../frontend/src/components/analytics/QuestionAnalyticsCard/hooks/useFreeTextAnalysis.ts):

- On mount (per `pollId`/`questionId`), `GET …/analysis`. If a result comes back,
  populate `analysis`, capture `generatedAt`, and expose `stale`. No LLM call.
- Keep `analyze()` (POST) for regeneration; it overwrites local state with the fresh
  result and clears `stale`.
- Expose `stale: boolean` and `generatedAt: string | null` on the view-model.

[QuestionAnalyticsCard.tsx](../../../frontend/src/components/analytics/QuestionAnalyticsCard/QuestionAnalyticsCard.tsx):

- Button label: **"Analyze with AI"** when nothing is cached, **"Re-analyze"** when a
  result exists (current behavior already keys off `ai.analysis`).
- When `ai.stale`, show a subtle hint near the AI summary, e.g.
  "Responses changed since this was generated — re-analyze to update."
- Optionally show `generatedAt` ("Generated <relative time>") — low priority.

## Error handling

- GET failure (network, 5xx): degrade silently to the button-only flow — render no
  cached result, no error banner. The user can still click Analyze.
- POST: unchanged red error banner on failure.
- Provider failure still surfaces as `502 AI_PROVIDER_ERROR`; nothing is cached.

## Testing (deferred — code first, per project rule)

Follow-up `analytics.service` specs:
- cache miss → `getQuestionAnalysis` returns `null`;
- cache hit, count unchanged → `stale: false`;
- cache hit, count changed → `stale: true`, still returns the stored result;
- real-provider POST upserts the row (`answerCount`, `model` set);
- mock POST does **not** persist;
- ownership / non-TEXT question → `NOT_FOUND` / `QUESTION_NOT_TEXT` from the GET path.

## Out of scope

- Hash-based invalidation (count is sufficient given append-only answers).
- Caching choice/multi analytics (those are computed, not LLM-backed).
- Background/scheduled regeneration; per-user cache variants.
- Editing or deleting cached analyses from the UI.
