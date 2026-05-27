# Landing & Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the landing page and login/register screens up to the fidelity of [design/AuthScreens.jsx](../../../design/AuthScreens.jsx) — full 6-section landing with rotating live-results card stack and interactive try-it demo; split-layout auth shell for login + register with decorative floating live-results card.

**Architecture:** Three public routes (`/`, `/login`, `/register`) opt out of `MainLayout` so they can render their own top chrome. New shared component `LiveResultsCard` powers the rotation animation. A small `useReducedMotion` hook gates motion. Auth screens get a new `AuthSplit` shell that replaces the deleted `AuthCard`.

**Tech Stack:** React 19, TypeScript, react-router-dom v6, Tailwind utility classes for layout/colors, inline `style` only for backdrops/transforms/keyframes that Tailwind doesn't cover, `sonner` for the "Forgot?" toast, `react-hook-form` + `zod` for the forms (unchanged).

**Spec:** [docs/superpowers/specs/2026-05-27-landing-and-auth-redesign.md](../specs/2026-05-27-landing-and-auth-redesign.md)

**Process note:** TDD is intentionally skipped on this project (see memory `feedback_defer_tdd.md`). Tasks are "implement → typecheck → commit." After Task 12 the existing e2e suite gets a smoke pass to confirm we didn't break form selectors.

---

## File map

**Created:**
- `frontend/src/lib/use-reduced-motion.ts` — Task 1.
- `frontend/src/components/marketing/LiveResultsCard.tsx` — Task 2.
- `frontend/src/routes/landing/LandingNav.tsx` — Task 3.
- `frontend/src/routes/landing/LandingHero.tsx` — Task 4.
- `frontend/src/routes/landing/LandingTryIt.tsx` — Task 5.
- `frontend/src/routes/landing/LandingFeatures.tsx` — Task 6.
- `frontend/src/routes/landing/LandingStats.tsx` — Task 7.
- `frontend/src/routes/landing/LandingCTA.tsx` — Task 7.
- `frontend/src/routes/auth/AuthBenefits.tsx` — Task 9.
- `frontend/src/routes/auth/AuthFormCard.tsx` — Task 9.
- `frontend/src/routes/auth/AuthSplit.tsx` — Task 9.

**Modified (full rewrite):**
- `frontend/src/routes/landing/LandingScreen.tsx` — Task 8.
- `frontend/src/routes/auth/LoginScreen.tsx` — Task 10.
- `frontend/src/routes/auth/RegisterScreen.tsx` — Task 11.
- `frontend/src/router.tsx` — Task 12.

**Deleted:**
- `frontend/src/routes/auth/AuthCard.tsx` — Task 12.

---

## Task 1: `useReducedMotion` hook

**Files:**
- Create: `frontend/src/lib/use-reduced-motion.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/use-reduced-motion.ts
git commit -m "feat(frontend): add useReducedMotion hook"
```

---

## Task 2: `LiveResultsCard` shared component

**Files:**
- Create: `frontend/src/components/marketing/LiveResultsCard.tsx`

This is the rotating animated poll-results card used by both `LandingHero` (×3 stacked) and `AuthSplit` (×1 decorative). The whole component is decorative — `aria-hidden="true"` on the root.

- [ ] **Step 1: Create the file (mkdir + write)**

```bash
mkdir -p /Users/andreevxdr/sources/survey-app/frontend/src/components/marketing
```

Then create `frontend/src/components/marketing/LiveResultsCard.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../lib/use-reduced-motion';

const ROTATING_POLLS = [
  {
    q: 'How would you rate your overall workload?',
    responses: 247,
    options: [
      { t: 'Light', pct: 12 },
      { t: 'Just right', pct: 51 },
      { t: 'Heavy', pct: 28 },
      { t: 'Overwhelming', pct: 9 },
    ],
  },
  {
    q: 'Which framework do you reach for first?',
    responses: 1842,
    options: [
      { t: 'React', pct: 58 },
      { t: 'Vue', pct: 18 },
      { t: 'Svelte', pct: 14 },
      { t: 'Solid', pct: 10 },
    ],
  },
  {
    q: 'Where should we hold the offsite?',
    responses: 38,
    options: [
      { t: 'Lisbon', pct: 42 },
      { t: 'Berlin', pct: 26 },
      { t: 'Mexico City', pct: 22 },
      { t: 'Stay remote', pct: 10 },
    ],
  },
] as const;

type Props = {
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  offset?: { x: number; y: number };
  delay?: number;
};

export function LiveResultsCard({
  rotate = 0,
  opacity = 1,
  zIndex = 1,
  offset = { x: 0, y: 0 },
  delay = 0,
}: Props) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [fill, setFill] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const start = setTimeout(() => setFill(true), 200 + delay);
    return () => clearTimeout(start);
  }, [idx, delay, reduced]);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setFill(false);
      setTimeout(() => setIdx((p) => (p + 1) % ROTATING_POLLS.length), 350);
    }, 4500);
    return () => clearInterval(interval);
  }, [reduced]);

  const poll = ROTATING_POLLS[idx];
  const max = Math.max(...poll.options.map((o) => o.pct));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: offset.y,
        left: offset.x,
        width: 340,
        transform: `rotate(${rotate}deg)`,
        opacity,
        zIndex,
        boxShadow:
          '0 20px 50px -12px rgb(31 41 55 / 0.18), 0 8px 16px -8px rgb(31 41 55 / 0.10)',
        transition: 'transform 400ms ease',
      }}
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600"
          style={{ animation: reduced ? undefined : 'lrc-pulse 2s infinite' }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Live · {poll.responses} responses
        </span>
      </div>
      <p className="mb-4 text-[15px] font-semibold leading-snug text-gray-900">
        {poll.q}
      </p>
      <div className="flex flex-col gap-[11px]">
        {poll.options.map((o, i) => {
          const leader = o.pct === max;
          return (
            <div key={`${idx}-${i}`}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={leader ? 'font-semibold text-gray-700' : 'text-gray-700'}>
                  {o.t}
                </span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    leader ? 'text-indigo-600' : 'text-gray-500'
                  }`}
                >
                  {o.pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  style={{
                    width: fill ? `${o.pct}%` : '0%',
                    transition: reduced
                      ? 'none'
                      : `width ${900 + i * 120}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }}
                  className={`h-full rounded-full ${
                    leader ? 'bg-indigo-600' : 'bg-indigo-300'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes lrc-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(22 163 74 / 0.6); }
          50%      { box-shadow: 0 0 0 6px rgb(22 163 74 / 0); }
        }
      `}</style>
    </div>
  );
}
```

Notes:
- `lrc-pulse` keyframes are scoped via a unique name to avoid colliding with other components.
- When `prefers-reduced-motion: reduce`, the initial `fill` is `true` so bars render at final width immediately, no interval runs, and the pulse animation is omitted.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/marketing/LiveResultsCard.tsx
git commit -m "feat(frontend): add LiveResultsCard rotating poll card"
```

---

## Task 3: `LandingNav`

**Files:**
- Create: `frontend/src/routes/landing/LandingNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';

export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-gray-200"
      style={{
        background: 'rgb(255 255 255 / 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.svg" width={28} height={28} alt="" />
          <span className="text-lg font-bold tracking-tight text-gray-900">Polls</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to="/login"
            className="rounded-md px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (new file, not yet imported — fine).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/landing/LandingNav.tsx
git commit -m "feat(frontend): add LandingNav sticky transparent top nav"
```

---

## Task 4: `LandingHero`

**Files:**
- Create: `frontend/src/routes/landing/LandingHero.tsx`

This is the largest landing component. Uses `LiveResultsCard` ×3 with rotation/opacity to create the stacked-card visual.

- [ ] **Step 1: Create the file**

```tsx
import { Link } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';
import { LiveResultsCard } from '../../components/marketing/LiveResultsCard';

const TRUST_AVATARS = [
  { initials: 'AP', bg: '#e0e7ff', fg: '#4338ca' },
  { initials: 'JK', bg: '#dcfce7', fg: '#15803d' },
  { initials: 'SM', bg: '#dbeafe', fg: '#1d4ed8' },
  { initials: 'LZ', bg: '#fee2e2', fg: '#b91c1c' },
] as const;

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Indigo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: -160,
          right: -80,
          width: 720,
          height: 720,
          background: 'radial-gradient(closest-side, rgb(99 102 241 / 0.13), transparent 70%)',
        }}
      />
      {/* Dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(180deg, black, transparent 80%)',
        }}
      />

      <div className="relative mx-auto max-w-[1180px] px-8 pb-24 pt-[72px]">
        <div className="hero-grid grid items-center gap-16" style={{ gridTemplateColumns: 'minmax(0, 1fr) 420px' }}>
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Anonymous · Cookie-deduped · Free
            </div>

            <h1
              className="mt-5 font-bold text-gray-900"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}
            >
              Ask anyone.<br />
              See it{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-indigo-600">instantly</span>
                <svg
                  viewBox="0 0 240 20"
                  preserveAspectRatio="none"
                  className="absolute left-0 right-0 z-0 h-4 w-full"
                  style={{ bottom: -8 }}
                  fill="none"
                  stroke="var(--indigo-300, #a5b4fc)"
                  strokeWidth={3}
                  strokeLinecap="round"
                >
                  <path d="M4 14 Q 60 4, 120 12 T 236 8" />
                </svg>
              </span>.
            </h1>

            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-gray-600">
              Single-choice, multiple-choice, and free-text polls. Share a link.
              Watch responses stream in. Export to CSV when you're done.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg">
                  Create your first poll
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">Sign in</Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <div className="flex items-center">
                {TRUST_AVATARS.map((a, i) => (
                  <div
                    key={a.initials}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold"
                    style={{
                      background: a.bg,
                      color: a.fg,
                      marginLeft: i === 0 ? 0 : -8,
                    }}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
              <div className="text-[13px] text-gray-600">
                <b className="text-gray-900">12,847</b> polls launched this week
              </div>
            </div>
          </div>

          {/* Right: stacked decorative cards */}
          <div className="hero-stack relative" style={{ height: 480 }}>
            <LiveResultsCard offset={{ x: 40, y: 40 }} rotate={4}  opacity={0.5}  zIndex={1} delay={200} />
            <LiveResultsCard offset={{ x: 20, y: 20 }} rotate={-3} opacity={0.75} zIndex={2} delay={100} />
            <LiveResultsCard offset={{ x: 0,  y: 0  }} rotate={0}  opacity={1}    zIndex={3} delay={0} />
          </div>
        </div>
      </div>
    </section>
  );
}
```

Note: The `hero-grid` and `hero-stack` classes have no Tailwind backing — they exist purely so the `<style>` block in Task 8's `LandingScreen` can target them for the `≤ 880px` collapse.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/landing/LandingHero.tsx
git commit -m "feat(frontend): add LandingHero with stacked live-results cards"
```

---

## Task 5: `LandingTryIt`

**Files:**
- Create: `frontend/src/routes/landing/LandingTryIt.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react';
import { useReducedMotion } from '../../lib/use-reduced-motion';

const OPTIONS = [
  { t: 'Tabs', pct: 64 },
  { t: 'Spaces', pct: 31 },
  { t: 'Either', pct: 5 },
] as const;

export function LandingTryIt() {
  const [picked, setPicked] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const max = Math.max(...OPTIONS.map((o) => o.pct));

  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div
        className="try-grid mx-auto grid max-w-[1180px] items-center gap-16 px-8 py-[72px]"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
      >
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Try it
          </div>
          <h2
            className="mt-3 font-bold text-gray-900"
            style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            One click. Instant&nbsp;results.
          </h2>
          <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-gray-600">
            No login. No friction. Pick an option and watch the bars fill —
            that's the same experience your respondents get.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600"
              style={{ animation: reduced ? undefined : 'lrc-pulse 2s infinite' }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Live · 3,127 responses
            </span>
          </div>
          <p className="mb-[18px] text-lg font-semibold text-gray-900">Tabs or spaces?</p>

          {picked === null ? (
            <div className="flex flex-col gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.t}
                  onClick={() => setPicked(o.t)}
                  className="rounded-md border border-gray-200 bg-white px-3.5 py-3 text-left text-sm text-gray-700 transition hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300" />
                    {o.t}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {OPTIONS.map((o, i) => {
                const isPicked = o.t === picked;
                const leader = o.pct === max;
                return (
                  <div key={o.t}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span
                        className={`inline-flex items-center gap-2 ${
                          isPicked ? 'font-semibold text-indigo-700' : 'text-gray-700'
                        }`}
                      >
                        {o.t}
                        {isPicked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`font-mono text-xs font-medium ${
                          leader ? 'text-indigo-600' : 'text-gray-500'
                        }`}
                      >
                        {o.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        style={{
                          width: `${o.pct}%`,
                          transition: reduced
                            ? 'none'
                            : `width ${800 + i * 150}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                        }}
                        className={`h-full rounded-full ${leader ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                      />
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setPicked(null)}
                className="mt-1 self-start text-[13px] text-indigo-600 hover:underline"
              >
                ← Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

Note: Reuses the `lrc-pulse` keyframe defined in `LiveResultsCard`. As long as one card is rendered on the page (the hero stack has 3), the keyframe is available. We also redefine it in Task 8's `LandingScreen` `<style>` block so this section works in isolation if `LiveResultsCard` ever changes.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/landing/LandingTryIt.tsx
git commit -m "feat(frontend): add interactive LandingTryIt demo poll"
```

---

## Task 6: `LandingFeatures`

**Files:**
- Create: `frontend/src/routes/landing/LandingFeatures.tsx`

- [ ] **Step 1: Create the component**

```tsx
type Feature = { title: string; body: string; iconPath: string };

const FEATURES: Feature[] = [
  {
    title: 'Three question types',
    body: 'Single-choice, multi-select, and free-text. Mix and match in one poll.',
    iconPath: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.4 48.4 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
  },
  {
    title: 'Anonymous by default',
    body: 'Respondents need no account. Cookie-based dedup prevents accidental re-submits.',
    iconPath: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
  },
  {
    title: 'Live analytics',
    body: 'Per-question breakdowns and a response timeline that updates as answers roll in.',
    iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  {
    title: 'Public or private',
    body: 'Share a public link or generate a revocable access token. Regen it any time.',
    iconPath: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  },
  {
    title: 'Export to CSV',
    body: "One click downloads a clean CSV of every response. Hook into your own pipeline.",
    iconPath: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
  },
  {
    title: 'Admin panel',
    body: 'Manage every user and every poll in the system. Bulk actions, filters, export.',
    iconPath: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pt-24 pb-8">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Everything you need
          </div>
          <h2
            className="mt-3 font-bold text-gray-900"
            style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            Built for asking. Not&nbsp;a&nbsp;framework.
          </h2>
        </div>

        <div
          className="mt-12 grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.iconPath} />
                </svg>
              </div>
              <h3 className="mb-1.5 mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Note: The `.feature-card` hover effect (`translateY(-2px) + border-indigo-300`) is defined in Task 8's `LandingScreen` `<style>` block.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/landing/LandingFeatures.tsx
git commit -m "feat(frontend): add LandingFeatures 6-card grid"
```

---

## Task 7: `LandingStats` + `LandingCTA`

**Files:**
- Create: `frontend/src/routes/landing/LandingStats.tsx`
- Create: `frontend/src/routes/landing/LandingCTA.tsx`

- [ ] **Step 1: Create `LandingStats.tsx`**

```tsx
const STATS = [
  { value: '12,847', label: 'Polls launched this week' },
  { value: '2.1M',   label: 'Responses collected' },
  { value: '<200ms', label: 'Median response submit' },
  { value: '0',      label: 'Tracking cookies set' },
] as const;

export function LandingStats() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pb-16">
        <div
          className="grid gap-4 rounded-2xl bg-gray-900 px-6 py-8 text-white"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="px-1 py-2 text-center"
              style={{
                borderRight:
                  i < STATS.length - 1 ? '1px solid var(--gray-700, #374151)' : 'none',
              }}
            >
              <div
                className="font-bold"
                style={{ fontSize: 36, letterSpacing: '-0.02em' }}
              >
                {s.value}
              </div>
              <div className="mt-1 text-[13px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `LandingCTA.tsx`**

```tsx
import { Link } from 'react-router-dom';

export function LandingCTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1180px] px-8 pb-24">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[20px] bg-indigo-600 px-12 py-14 text-white">
          {/* Decorative dot grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgb(255 255 255 / 0.16) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage:
                'linear-gradient(180deg, transparent, black 30%, black 70%, transparent)',
              WebkitMaskImage:
                'linear-gradient(180deg, transparent, black 30%, black 70%, transparent)',
            }}
          />
          <div className="relative">
            <h2
              className="font-bold text-white"
              style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Ready to ask?
            </h2>
            <p className="mt-2.5 max-w-[460px] text-base" style={{ color: 'rgb(224 231 255 / 0.9)' }}>
              Create a poll in under a minute. No credit card. Cancel by not signing in again.
            </p>
          </div>
          <div className="relative flex gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-base font-semibold text-indigo-700 transition hover:bg-gray-100"
            >
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/landing/LandingStats.tsx frontend/src/routes/landing/LandingCTA.tsx
git commit -m "feat(frontend): add LandingStats and LandingCTA sections"
```

---

## Task 8: `LandingScreen` composer + global style block

**Files:**
- Modify (full rewrite): `frontend/src/routes/landing/LandingScreen.tsx`

This wires all 6 section components together and declares the `<style>` block with the page-level keyframes, hover effects, and responsive breakpoints.

- [ ] **Step 1: Rewrite the file**

```tsx
import { LandingNav } from './LandingNav';
import { LandingHero } from './LandingHero';
import { LandingTryIt } from './LandingTryIt';
import { LandingFeatures } from './LandingFeatures';
import { LandingStats } from './LandingStats';
import { LandingCTA } from './LandingCTA';

export function LandingScreen() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes lrc-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(22 163 74 / 0.6); }
          50%      { box-shadow: 0 0 0 6px rgb(22 163 74 / 0); }
        }
        .feature-card { transition: transform 200ms ease, border-color 200ms ease; }
        .feature-card:hover {
          transform: translateY(-2px);
          border-color: var(--indigo-300, #a5b4fc) !important;
        }
        @media (max-width: 880px) {
          .hero-grid, .try-grid { grid-template-columns: 1fr !important; }
          .hero-stack { height: 440px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .feature-card { transition: none; }
          .feature-card:hover { transform: none; }
        }
      `}</style>
      <LandingNav />
      <LandingHero />
      <LandingTryIt />
      <LandingFeatures />
      <LandingStats />
      <LandingCTA />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/landing/LandingScreen.tsx
git commit -m "feat(frontend): compose LandingScreen from 6 redesigned sections"
```

---

## Task 9: `AuthBenefits` + `AuthFormCard` + `AuthSplit`

**Files:**
- Create: `frontend/src/routes/auth/AuthBenefits.tsx`
- Create: `frontend/src/routes/auth/AuthFormCard.tsx`
- Create: `frontend/src/routes/auth/AuthSplit.tsx`

- [ ] **Step 1: Create `AuthBenefits.tsx`**

```tsx
const ITEMS = [
  'Single, multiple-choice, and free-text questions',
  'Real-time results with per-question breakdowns',
  'Anonymous responses · cookie-deduped',
  'Public links or revocable private tokens',
] as const;

export function AuthBenefits() {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {ITEMS.map((it) => (
        <li key={it} className="flex items-start gap-3 text-[15px] leading-snug text-gray-700">
          <span className="mt-0.5 inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create `AuthFormCard.tsx`**

```tsx
import { ReactNode } from 'react';

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-9"
      style={{
        boxShadow:
          '0 20px 50px -12px rgb(31 41 55 / 0.12), 0 8px 16px -8px rgb(31 41 55 / 0.08)',
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create `AuthSplit.tsx`**

```tsx
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LiveResultsCard } from '../../components/marketing/LiveResultsCard';

type Props = { side: ReactNode; children: ReactNode };

export function AuthSplit({ side, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <style>{`
        @media (max-width: 920px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-left { padding: 32px 24px !important; }
          .auth-floater { display: none !important; }
        }
      `}</style>

      {/* Indigo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: -180,
          right: -160,
          width: 720,
          height: 720,
          background: 'radial-gradient(closest-side, rgb(99 102 241 / 0.14), transparent 70%)',
        }}
      />
      {/* Dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(135deg, black, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(135deg, black, transparent 70%)',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img src="/logo-mark.svg" width={28} height={28} alt="" />
          <span className="text-lg font-bold tracking-tight text-gray-900">Polls</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </header>

      <div
        className="auth-grid relative z-[1] mx-auto grid items-center gap-16 px-8 pb-16 pt-5"
        style={{
          maxWidth: 1120,
          gridTemplateColumns: 'minmax(0, 1fr) 460px',
          minHeight: 'calc(100vh - 84px)',
        }}
      >
        {/* Left: branding side */}
        <div className="auth-left relative">
          {side}

          {/* Decorative floating card */}
          <div
            className="auth-floater pointer-events-none absolute"
            style={{ bottom: -40, left: -40, width: 300, transform: 'rotate(-3deg)', opacity: 0.85 }}
          >
            <div className="relative">
              <LiveResultsCard offset={{ x: 0, y: 0 }} rotate={0} opacity={1} zIndex={1} />
            </div>
          </div>
        </div>

        {/* Right: form column */}
        <div className="relative z-[5]">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (these files are not imported yet — fine).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/auth/AuthBenefits.tsx \
        frontend/src/routes/auth/AuthFormCard.tsx \
        frontend/src/routes/auth/AuthSplit.tsx
git commit -m "feat(frontend): add AuthSplit shell with AuthBenefits and AuthFormCard"
```

---

## Task 10: `LoginScreen` rewrite

**Files:**
- Modify (full rewrite): `frontend/src/routes/auth/LoginScreen.tsx`

- [ ] **Step 1: Replace contents with**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthSplit } from './AuthSplit';
import { AuthBenefits } from './AuthBenefits';
import { AuthFormCard } from './AuthFormCard';
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
    <AuthSplit
      side={
        <>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Welcome back
          </div>
          <h1
            className="mt-5 font-bold text-gray-900"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
          >
            Sign in to keep<br />
            <span className="text-indigo-600">asking</span>.
          </h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-gray-600">
            Your polls, your responses, your analytics — pick up exactly where you left off.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign in</h2>
        <p className="mt-1.5 text-sm text-gray-500">Enter your email and password.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
            <Input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          </Field>

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="login-pw" className="text-sm font-medium text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => toast.info('Password reset is not implemented yet.')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Forgot?
              </button>
            </div>
            <Input id="login-pw" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
            {errors.password?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" isLoading={login.isPending} className="w-full">
            Sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Create one
          </Link>
        </p>
      </AuthFormCard>
    </AuthSplit>
  );
}
```

Note: The Forgot button is `type="button"` (not a link) so it doesn't navigate, doesn't submit, just fires the toast.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/auth/LoginScreen.tsx
git commit -m "feat(frontend): rewrite LoginScreen with AuthSplit + Forgot stub"
```

---

## Task 11: `RegisterScreen` rewrite

**Files:**
- Modify (full rewrite): `frontend/src/routes/auth/RegisterScreen.tsx`

- [ ] **Step 1: Replace contents with**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthSplit } from './AuthSplit';
import { AuthBenefits } from './AuthBenefits';
import { AuthFormCard } from './AuthFormCard';
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
    <AuthSplit
      side={
        <>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Free · No credit card
          </div>
          <h1
            className="mt-5 font-bold text-gray-900"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
          >
            Create your<br />
            <span className="text-indigo-600">first poll</span> in 60s.
          </h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-gray-600">
            One account, unlimited polls. Share a link, collect responses, watch the bars fill.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Create account</h2>
        <p className="mt-1.5 text-sm text-gray-500">Takes about a minute.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Name" htmlFor="reg-name" error={errors.name?.message}>
            <Input id="reg-name" autoComplete="name" placeholder="Alex Petrov" {...registerInput('name')} />
          </Field>
          <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
            <Input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com" {...registerInput('email')} />
          </Field>
          <div>
            <label htmlFor="reg-pw" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <Input id="reg-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...registerInput('password')} />
            {errors.password?.message ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">
                Use 8+ characters with a mix of letters, numbers &amp; symbols.
              </p>
            )}
          </div>

          <Button type="submit" size="lg" isLoading={reg.isPending} className="w-full">
            Create account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </AuthFormCard>

      <p className="mx-auto mt-4 max-w-[380px] text-center text-xs leading-relaxed text-gray-500">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthSplit>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/auth/RegisterScreen.tsx
git commit -m "feat(frontend): rewrite RegisterScreen with AuthSplit"
```

---

## Task 12: Router split + delete AuthCard + verify

**Files:**
- Modify (full rewrite): `frontend/src/router.tsx`
- Delete: `frontend/src/routes/auth/AuthCard.tsx`

- [ ] **Step 1: Rewrite `frontend/src/router.tsx`**

Replace its contents entirely with the code below. Note the structure:
- Three public routes at top level (no `MainLayout` wrapper) — `/`, `/login`, `/register`.
- One `MainLayout` group for authenticated routes, public poll page, and `/admin/*` redirects.
- A top-level catch-all `'*'` redirect to keep parity with today (`/xyz` → `/`).

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { LandingScreen } from './routes/landing/LandingScreen';
import { LoginScreen } from './routes/auth/LoginScreen';
import { RegisterScreen } from './routes/auth/RegisterScreen';
import { DashboardScreen } from './routes/dashboard/DashboardScreen';
import { MyPollsTab } from './routes/dashboard/MyPollsTab';
import { UsersTab } from './routes/dashboard/UsersTab';
import { AnalyticsTab } from './routes/dashboard/AnalyticsTab';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { PollFormScreen } from './routes/polls/PollFormScreen';
import { PollScreen } from './routes/poll/PollScreen';
import { OwnerAnalyticsScreen } from './routes/polls/analytics/OwnerAnalyticsScreen';

export const router = createBrowserRouter([
  // Public marketing/auth surface — own top chrome, no MainLayout Header.
  { path: '/', element: <LandingScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },

  // Everything else: MainLayout with the existing Header.
  {
    element: <MainLayout />,
    children: [
      { path: '/p/:slug', element: <PollScreen /> },

      {
        path: '/dashboard',
        element: <RequireAuth><DashboardScreen /></RequireAuth>,
        children: [
          { index: true, element: <MyPollsTab /> },
          { path: 'users', element: <RequireAdmin><UsersTab /></RequireAdmin> },
          { path: 'analytics', element: <RequireAdmin><AnalyticsTab /></RequireAdmin> },
        ],
      },

      { path: '/polls/new', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/edit', element: <RequireAuth><PollFormScreen /></RequireAuth> },
      { path: '/polls/:id/analytics', element: <RequireAuth><OwnerAnalyticsScreen /></RequireAuth> },

      { path: '/admin', element: <Navigate to="/dashboard" replace /> },
      { path: '/admin/users', element: <Navigate to="/dashboard/users" replace /> },
      { path: '/admin/analytics', element: <Navigate to="/dashboard/analytics" replace /> },
    ],
  },

  // Top-level catch-all so unknown paths outside MainLayout still redirect home.
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

- [ ] **Step 2: Delete `AuthCard.tsx`**

```bash
git rm frontend/src/routes/auth/AuthCard.tsx
```

- [ ] **Step 3: Confirm nothing else imports `AuthCard`**

Run from `frontend/`: `grep -r --include='*.ts' --include='*.tsx' 'AuthCard' src`
Expected: zero matches. If anything appears, remove the import (or fix the file) before continuing.

- [ ] **Step 4: Final typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Unit tests still pass**

Run: `cd frontend && npm test`
Expected: 5/5 unit tests pass. The vitest exclude added previously keeps Playwright specs out of the run.

- [ ] **Step 6: Sanity-grep for the old auth UI**

Run from `frontend/`: `grep -rn 'AuthCard\|Admin Panel' src e2e`
Expected: zero matches (Admin Panel link was removed previously; AuthCard is now gone).

- [ ] **Step 7: e2e smoke** (skip if Docker is not running)

If `docker-compose ps` shows the stack up:

Run: `cd frontend && npm run test:e2e`  ← runs the full e2e suite, both specs.

Expected: both Playwright specs pass. The auth-and-polls spec exercises the rewritten login + register forms by field labels, so they should still pass as long as the labels (`Email`, `Password`, `Name`) and button labels (`Sign in`, `Create account`) match.

If e2e fails, inspect the failure output. Common cause after this change: the new `AuthSplit` shell renders the forms inside additional nested layout `<div>`s — selectors based on `getByRole('main')` may need adjustment. Note: the spec says "If any existing e2e selector breaks because of structural changes, update the selector — don't loosen the assertion."

- [ ] **Step 8: Commit**

```bash
git add frontend/src/router.tsx frontend/src/routes/auth/AuthCard.tsx
git commit -m "feat(frontend): split router into public + MainLayout groups, drop AuthCard"
```

(The `git rm` from Step 2 staged the deletion; `git add` here picks up the router rewrite.)

---

## Task 13: Manual UI verification

This is a human-driven verification step, not subagent-driven. The implementer should report back the test results below. If the docker stack isn't running, ask the user whether to bring it up or skip the visual check.

- [ ] **Step 1: Bring up the stack (skip if already running)**

```bash
docker-compose ps  # check
docker-compose up -d  # if not running
```

- [ ] **Step 2: Verify `/` anonymously**

Open http://localhost:5173/. Confirm:
- Sticky transparent-blur top nav with logo + "Sign in" + "Get started" CTAs.
- Hero: eyebrow pill (`Anonymous · Cookie-deduped · Free`), large headline with SVG underline beneath "instantly", lead paragraph, two CTAs, trust strip with 4 colored avatars + "12,847 polls launched this week".
- To the right of the hero text: 3 stacked live-results cards rotating between the 3 polls every ~4.5s with animated bar fills.
- Try-It section: gray background, "One click. Instant results." headline, working clickable poll. Clicking an option fills the bars; Reset returns to unfilled state.
- Features: 6-card grid with indigo-tile icons. Hover lifts the card and changes the border to indigo-300.
- Stats: dark banner with 4 numbers (`12,847`, `2.1M`, `<200ms`, `0`).
- Final CTA: indigo banner with "Ready to ask?" + 2 buttons.

- [ ] **Step 3: Verify `/login` anonymously**

Open http://localhost:5173/login. Confirm:
- Own top bar with logo + "Back to home" link (with left-arrow icon).
- Left column: "Welcome back" eyebrow, "Sign in to keep asking." headline (asking in indigo), lead paragraph, 4-item benefits list, decorative floating live-results card at bottom-left.
- Right column: white shadow card with "Sign in" + subtitle, email field, password field with inline "Forgot?" link, "Sign in" button with arrow icon, "Don't have an account? Create one" link.
- Click "Forgot?" → toast appears reading "Password reset is not implemented yet."
- Submit invalid credentials → toast error "Invalid email or password".
- Submit `admin@polls.local` / `admin` → redirects to `/dashboard`.

- [ ] **Step 4: Verify `/register` anonymously**

Open http://localhost:5173/register. Confirm:
- Same AuthSplit shell, different eyebrow ("Free · No credit card"), headline "Create your first poll in 60s." (first poll in indigo).
- Right column: "Create account" heading + subtitle, name + email + password fields (with helper text under password), "Create account" button, "Already have an account? Sign in" link, terms text below the card.
- Submitting valid info creates a user and redirects to /dashboard.

- [ ] **Step 5: Verify Header is suppressed on these 3 routes**

The `MainLayout.Header` (logo + Dashboard link + Avatar + Sign out) should NOT render on `/`, `/login`, or `/register`. The own top bars on each render in its place. Open dev tools and search for an element matching `header > nav a[href="/dashboard"]` on these pages — should not exist.

- [ ] **Step 6: Verify authenticated routes still have the original Header**

Log in. On `/dashboard`, `/polls/new`, and `/p/:slug` (with any existing poll), the original `Header` should render at the top (logo + Dashboard link + Avatar + name + Sign out).

- [ ] **Step 7: Verify responsive collapse**

Resize the window narrower than ~880px:
- Landing hero and try-it grids collapse to single column (text first, card stack/preview below).
- AuthSplit (resize at ~920px or below): grid collapses to one column, floating decorative `LiveResultsCard` is hidden.

- [ ] **Step 8: Verify reduced-motion**

In macOS System Settings → Accessibility → Display → Reduce motion, enable it. Reload `/`:
- The hero card stack no longer rotates; the front card shows the first poll with bars filled.
- The pulse on the green "Live" dot is suppressed.
- The Try-It bar fills are instant.

(On other OSes, equivalent setting; or DevTools → Rendering panel → "Emulate CSS prefers-reduced-motion: reduce".)

- [ ] **Step 9: Nothing to commit** if all prior tasks committed cleanly.

`git status` should be clean.
