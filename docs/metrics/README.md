# Measurements & Evaluation

This directory answers the "where are the numbers?" question: quantitative results for
performance, cost, LLM-analysis quality, test coverage, usage, and a before/after for the
AI-caching feature. All figures below were **measured** on this codebase, not estimated —
the scripts that produce them are committed so they're reproducible.

Reproduce:

```bash
# 1. Bring up DB + backend, seed demo data
docker compose -f docker-compose.yml up -d db
npm --workspace backend run db:seed
npm --workspace backend run start:dev      # :3000

# 2. Latency benchmark (p50/p95/p99 over 200 iters/endpoint)
node docs/metrics/bench.mjs

# 3. LLM-analysis quality eval (mock baseline vs real provider)
node eval/run-eval.mjs                                   # deterministic mock
DEEPSEEK_API_KEY=sk-... node eval/run-eval.mjs           # real DeepSeek

# 4. Coverage
npm --workspace backend test -- --coverage
npm --workspace frontend test -- --coverage
```

Measurement environment: local dev (macOS, Colima Postgres on :5433, backend `start:dev`).
Treat absolute latencies as relative indicators, not production SLOs.

---

## 1. API performance — response time

Latency per endpoint, 200 iterations each after 5 warm-up calls (`docs/metrics/bench.mjs`).
All values in **milliseconds**.

| Endpoint | p50 | p95 | p99 | mean |
|---|---|---|---|---|
| `POST /public/polls/:slug/responses` (anon submit) | 0.25 | 0.42 | 0.67 | 0.26 |
| `GET /public/polls/:slug` (anon read) | 1.51 | 3.06 | 6.34 | 1.76 |
| `GET /polls` (auth list) | 2.81 | 4.75 | 6.08 | 2.84 |
| `GET /polls/:id/analytics` (owner) | 3.28 | 5.10 | 6.08 | 3.45 |
| `GET …/analysis` (AI cache **miss**, null body) | 3.97 | 5.63 | 7.39 | 3.88 |
| `GET …/analysis` (AI cache **hit**) | 5.27 | 7.59 | 10.13 | 5.37 |
| `POST …/analyze` (mock generate, no network) | 1.37 | 2.40 | 3.80 | 1.50 |

**Read:** every core API path serves in **single-digit milliseconds at p95**. The submit path
is sub-millisecond (it short-circuits on cookie-dedup for repeat submissions — treat as a lower
bound, not a representative first-submit cost).

---

## 2. AI analysis — cost & the cache before/after

The "Analyze with AI" feature calls DeepSeek (`deepseek-chat`). We measured one real call's
token usage and round-trip, then computed cost at list price ($0.27/1M input, $1.10/1M output).

**Measured, real DeepSeek call** (service-feedback question, 8 free-text answers):

| Metric | Value |
|---|---|
| Input tokens (measured) | 163 |
| Output tokens (measured) | 278 |
| **Cost per analysis** | **$0.00035 (~0.035 ₽)** → ~2 860 calls / $1 |
| **Round-trip latency (median of 5)** | **2 924 ms** (min 2 802, max 3 018) |

### Before / after introducing the cache (PR #5)

The cache stores the analysis per question and serves it on reopen unless the answer set changed.

| | Before cache (every open) | After cache (repeat open) | Delta |
|---|---|---|---|
| Latency to show analysis | ~2 924 ms (LLM round-trip) | ~5 ms (DB read) | **≈ 585× faster** |
| Cost per repeat open | $0.00035 | **$0** | **100% saved** |
| External API calls per N opens of unchanged data | N | 1 | (N−1) eliminated |

**Business value:** for any poll whose analytics page is opened more than once between new
responses — the common case — every reopen after the first is **free and instant** instead of a
~3-second paid LLM call. Staleness is tracked by free-text answer count, so a genuinely changed
poll still regenerates.

---

## 3. LLM-analysis quality

Reproducible eval (`eval/run-eval.mjs`) over a human-labeled gold set (`eval/gold-set.json`,
3 cases): sentiment scored by dominant-bucket match; themes by token overlap with expected themes.

| Provider | Sentiment accuracy | Mean theme recall | Mean theme precision |
|---|---|---|---|
| Deterministic mock (fallback) | **3/3 (100%)** | 0.34 | 0.27 |
| **Real DeepSeek** | **3/3 (100%)** | **0.60** | 0.29 |

**Read:** both get sentiment right on this set; the real LLM nearly **doubles theme recall**
(0.34 → 0.60) — it surfaces the meaningful topics the keyword-frequency mock misses. This is the
measurable quality gain that justifies the LLM over the deterministic baseline. The harness is the
mechanism to keep checking this as prompts/models change; the gold set should be grown with real
anonymized responses for a stronger signal.

---

## 4. Test coverage

Layered test pyramid. Backend: **81 unit tests** (Jest, mocked Prisma) + **5 e2e suites**
(testcontainers, real Postgres). Frontend: **8 unit tests** (Vitest) + **2 Playwright e2e specs**.

Backend **unit** coverage concentrates on business logic (controllers/DTOs/guards are covered by
the e2e suite, so they read low in the unit-only run):

| Module | Stmts | Branch | Funcs |
|---|---|---|---|
| `analytics.service.ts` | 85% | 65% | 87% |
| `users.service.ts` | 93% | 96% | 100% |
| `responses.service.ts` | 93% | 83% | 100% |
| `auth.service.ts` | 64% | 38% | 70% |
| `tokens.service.ts` | 96% | 33% | 100% |
| `polls.service.ts` | 65% | 42% | 65% |
| `slug.service.ts` | 100% | 100% | 100% |

Frontend unit coverage targets the logic units (hooks/guards), e.g. `Button` 100%,
`RequireAuth` 71%, `useFreeTextAnalysis` covered; presentational JSX is exercised by Playwright.

> Honest note: aggregate line-coverage is modest (backend ~42% unit-only, frontend ~3%) because
> controllers and React views are validated by the e2e layer rather than unit tests. The numbers
> above report where unit tests deliberately concentrate — the stateful service logic.

---

## 5. Usage metrics (current seeded/demo instance)

From `GET /admin/analytics` + direct DB counts:

| Metric | Value |
|---|---|
| Users (of which admins) | 12 (3) |
| Polls (active) | 9 (9) |
| Questions (free-text) | 9 (3) |
| Responses | 55 |
| Answers (free-text) | 55 (23) |
| Avg free-text answer length | 48 chars |

The app already exposes system-wide usage via the admin analytics endpoint; on a production
instance these become live adoption metrics (DAU, polls/created, responses/poll, analyses/run).

---

## 6. User study — methodology

A protocol for a 5–10 participant usability test is in
[user-study-protocol.md](user-study-protocol.md): task scenarios, the metrics to capture
(time-to-create-poll, task success rate, time-to-first-insight with vs without AI), and a
standard **SUS** questionnaire. Running it requires human participants (out of scope for an
automated measurement pass); the protocol makes the run turnkey.
