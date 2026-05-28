# DeepSeek backend for free-text analysis — design

**Date:** 2026-05-28
**Scope:** Backend only. Replace the mock-only implementation of `AnalyticsService.analyzeFreeTextQuestion` with a router: call DeepSeek when `DEEPSEEK_API_KEY` is set, fall back to the existing mock otherwise. The OpenAPI contract and frontend are unchanged.

## Problem

The prior spec ([2026-05-28-analyze-with-ai-button-design.md](./2026-05-28-analyze-with-ai-button-design.md)) shipped a deterministic mock so the UX could land without a real LLM. The mock is fine for demos and CI, but the actual product story needs a real model. DeepSeek's chat-completions API is OpenAI-compatible, cheap, and returns the structured-JSON shape the UI already expects.

## Goal

Plug DeepSeek into the existing endpoint with a single env-var switch. With no key, behavior is identical to today (mock). With a key, the call goes to DeepSeek and the parsed result flows through unchanged.

## Non-goals (deferred)

- Streaming responses or a progress UI — the existing loading spinner stays.
- Persisting analyses (no DB column / no cache). Same as Spec 1.
- Multi-provider fallback chains (Anthropic / OpenAI / mock as last-resort).
- Bring-your-own-key from the UI; the key lives only in backend env.
- Rate limiting, billing hooks, prompt-injection mitigations beyond a strict JSON schema instruction.
- Migrating off the OpenAI-compatible REST shape (e.g. switching to a DeepSeek-specific SDK).

## Design

### Routing inside `analyzeFreeTextQuestion`

`AnalyticsService.analyzeFreeTextQuestion` keeps its current Prisma loads and validations. The single change is the final line:

```ts
return process.env.DEEPSEEK_API_KEY
  ? deepseekAnalyzeAnswers(question.text, answers)
  : mockAnalyzeAnswers(answers);
```

The env var is read on each call — no module-level capture. This lets dev rotate the key without a restart and lets tests temporarily set/unset it with `process.env`.

### DeepSeek helper

A new private helper inside [`backend/src/analytics/analytics.service.ts`](../../../backend/src/analytics/analytics.service.ts):

```ts
async function deepseekAnalyzeAnswers(
  questionText: string,
  answers: string[],
): Promise<AiAnalysisDto>
```

Implementation outline:

1. Build the prompt from the design template (`design/Polls App.html:3046`):
   - System: `"You analyze open-text survey responses. Respond with strict JSON only — no prose, no markdown fences."`
   - User: the schema description (`summary`, `sentiment`, `themes`) followed by `Question: <questionText>` and a numbered list of answers.
2. POST to `https://api.deepseek.com/chat/completions` with body:
   ```json
   {
     "model": "<DEEPSEEK_MODEL or 'deepseek-chat'>",
     "messages": [ { "role": "system", ... }, { "role": "user", ... } ],
     "response_format": { "type": "json_object" },
     "temperature": 0.2,
     "max_tokens": 800
   }
   ```
   Headers: `Authorization: Bearer ${DEEPSEEK_API_KEY}`, `Content-Type: application/json`.
3. 30-second timeout via `AbortController` (`signal: AbortSignal.timeout(30_000)`).
4. On non-2xx: throw `BadGatewayException({ code: 'AI_PROVIDER_ERROR', message: 'DeepSeek call failed' })`.
5. Read `choices[0].message.content` as a string, `JSON.parse` it. On parse failure: throw `BadGatewayException` with the same code.
6. Run a runtime validator `coerceAiAnalysis(raw)` that returns a clean `AiAnalysisDto`:
   - `summary` must be a non-empty string.
   - `sentiment.positive` / `.neutral` / `.negative` must each be finite numbers; round to integers; if they don't sum to 100 ±2, normalize by subtracting drift from `neutral` (clamp to ≥0).
   - `themes` must be an array; coerce each item's `label` to a non-empty string, `count` to an integer ≥ 1, `quote` to a string (default `''`); cap to first 5; drop items missing `label`.
   - If the top-level shape is wrong (e.g. `summary` missing) → throw `BadGatewayException`.

This validator gives us the same DTO guarantees the mock provides, even when the model returns extra fields or slightly malformed numbers.

### Error surface

All failure modes — missing key handled by router (no throw), DeepSeek 4xx/5xx, network timeout, malformed JSON, schema mismatch — bubble out as `BadGatewayException` (502) with `{ code: 'AI_PROVIDER_ERROR' }`. The existing `useFreeTextAnalysis` hook already maps any non-OK response to the user-visible "Could not analyze responses. Try again." panel, so the frontend needs no change.

### Env vars

Update [`.env.example`](../../../.env.example):

```
# AI provider for free-text analytics. Leave blank to use the built-in mock.
DEEPSEEK_API_KEY=
# Optional override; defaults to deepseek-chat.
# DEEPSEEK_MODEL=deepseek-chat
```

Document the env vars in the "Gotchas" section of [`CLAUDE.md`](../../../CLAUDE.md) so future engineers know the switch exists.

### Tests

Add a new `describe` block to [`backend/src/analytics/analytics.service.spec.ts`](../../../backend/src/analytics/analytics.service.spec.ts) covering `analyzeFreeTextQuestion` under the DeepSeek branch. Mock `global.fetch` with `jest.spyOn(global, 'fetch')` and restore in `afterEach`. Set `process.env.DEEPSEEK_API_KEY = 'test-key'` for these cases; clear it in `afterEach`.

Cases:
- **Happy path:** fetch returns a 200 with a well-formed JSON in `choices[0].message.content` → service returns a DTO whose `summary` / `sentiment` / `themes` reflect that JSON.
- **HTTP 500:** fetch resolves with `{ ok: false, status: 500 }` → service throws `BadGatewayException` with `code: 'AI_PROVIDER_ERROR'`.
- **Malformed content:** fetch returns 200 but the content isn't valid JSON → `BadGatewayException`.
- **Schema mismatch:** fetch returns 200 with valid JSON missing `summary` → `BadGatewayException`.
- **Mock-fallback when no key:** existing mock tests already cover this; add one extra assertion that with `DEEPSEEK_API_KEY` unset, `global.fetch` is never called (using a spy that would explode if invoked).

## Out-of-scope reminders

- No frontend changes. The OpenAPI contract is untouched (same DTO, same route).
- No new module, no new file under `dto/`. The helper lives alongside the existing mock helpers in `analytics.service.ts`.
- No retry logic. One attempt, surface the error, let the user click the button again.
