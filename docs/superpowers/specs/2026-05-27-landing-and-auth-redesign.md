# Landing & auth redesign

Date: 2026-05-27
References: [design/AuthScreens.jsx](../../../design/AuthScreens.jsx) (mockup source), [design/styles.css](../../../design/styles.css) (token reference).

## Motivation

The original survey-app spec [2026-05-26-survey-app-design.md](2026-05-26-survey-app-design.md) calls out a multi-section landing and a split-layout auth shell as part of the v1 visual surface, but Plan 1 delivered minimal placeholders: a single-headline `LandingScreen`, and centered `AuthCard`-based login/register screens. The design files in `design/AuthScreens.jsx` describe a substantially richer surface, and the user wants those screens shipped as designed.

This spec covers the public marketing/auth surface only. Authenticated routes (`/dashboard`, `/polls/*`, `/p/:slug`) are not touched.

## Goals

- Reproduce the landing page from the design with all 6 sections and the two interactive animations (rotating live-results card stack, try-it demo poll), using Tailwind utility classes where possible and inline `style` only for what Tailwind can't express (radial gradients, dotted-grid backgrounds, per-instance transforms, keyframes).
- Reproduce the AuthSplit shell from the design for both `/login` and `/register`, replacing the current centered `AuthCard` pattern. Same look, same copy, same decorative floating live-results card.
- Remove `MainLayout`'s global `Header` from these three routes — each page owns its top bar — by splitting `router.tsx` into two top-level groups.
- Respect `prefers-reduced-motion` for the rotation and bar-fill animations.

## Non-goals

- No backend changes. No new endpoints, no public-stats endpoint.
- No password-reset flow. The "Forgot?" link is a stub that shows a toast.
- No changes to `MainLayout` itself or to any authenticated route.
- No visual changes to the existing `Header`. It still renders for authenticated routes; we just don't pull it onto the public surface.
- No new icon library. Feature icons are inline SVG paths transcribed from the design (Heroicons-style outlines).
- No demo-credentials line under the login form (the design shows one with fake values; we drop it entirely).
- No auth-aware adaptation of the landing or auth screens. A logged-in user sees the same anonymous CTAs as everyone else. Accepted tradeoff per user decision.
- No `/p/:slug` redesign. That stays on `MainLayout`.
- No redesign of the existing `Field`, `Input`, `Button`, `Card`, `Spinner` primitives.

## Architecture

### Route table split

Before:

```
{
  element: <MainLayout />,
  children: [
    { path: '/', element: <LandingScreen /> },
    { path: '/login', element: <LoginScreen /> },
    { path: '/register', element: <RegisterScreen /> },
    { path: '/p/:slug', element: <PollScreen /> },
    { path: '/dashboard', ..., children: [...] },
    { path: '/polls/new', ... },
    ...
  ],
}
```

After:

```
[
  // Public marketing/auth surface — no global Header.
  { path: '/', element: <LandingScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },

  // Everything else lives under MainLayout with the existing Header.
  {
    element: <MainLayout />,
    children: [
      { path: '/p/:slug', element: <PollScreen /> },
      { path: '/dashboard', ..., children: [...] },
      { path: '/polls/new', ... },
      ...
      // Legacy /admin/* redirects move here too.
      // Catch-all '*' Navigate stays at the end.
    ],
  },
]
```

Each of the three public routes owns its own top chrome (`LandingNav` for `/`; `AuthSplit`'s own top bar for `/login` and `/register`). The catch-all `'*'` Navigate stays inside the `MainLayout` group, at the end. Any URL that doesn't match the three public routes and doesn't match a route under `MainLayout` falls through to the existing `Navigate to="/"`. Behavior unchanged.

### Layout decisions

- **No bare `PublicLayout` wrapper.** Each public screen renders its own outer `<div min-h-screen bg-white>` and its own top bar. Wrapping them in another layout would just add an empty `<Outlet />` for no value.
- **`MainLayout` is untouched.** It keeps wrapping the authenticated routes through its `<Outlet />`.
- **No conditional rendering inside `Header`.** Splitting the router table is cleaner than `Header` checking `useLocation()` to decide whether to return null.

## File map

### Created

- `frontend/src/components/marketing/LiveResultsCard.tsx`
  - Rotating poll-results card. Cycles through a hardcoded `ROTATING_POLLS` array every 4500ms, animates bar widths from 0% to their percentage on each swap. Props for position offset, rotation, opacity, z-index, and `aria-hidden` (the card is decorative).
  - Used by both `LandingHero` (three stacked instances with `rotate=-3,0,+4` and `opacity=0.5,0.75,1`) and `AuthSplit` (single instance, `rotate=-3`, `opacity=0.85`, decorative bottom-left).
  - Lives under `components/marketing/` because it's reused across `routes/landing/` and `routes/auth/`. It is not a primitive (it has its own data), so it doesn't belong in `components/primitives/`.

- `frontend/src/routes/landing/LandingNav.tsx`
  - Sticky transparent-blur top nav. Logo + "Sign in" + "Get started" CTAs. No `useAuth()` check — same UI for everyone.

- `frontend/src/routes/landing/LandingHero.tsx`
  - Eyebrow badge, big clamp-sized headline with hand-drawn SVG underline beneath the word "instantly", lead paragraph, two CTAs (`<Link to="/register">` primary + `<Link to="/login">` secondary), trust strip (4 colored initial avatars + counter), animated `LiveResultsCard` stack on the right (3 layered instances).
  - Renders the radial-gradient indigo wash + dotted-grid backdrop via inline `style` on absolutely-positioned `<div>`s.

- `frontend/src/routes/landing/LandingTryIt.tsx`
  - Interactive demo poll. Three options ("Tabs", "Spaces", "Either") with hardcoded percentages. Click to reveal animated result bars + Reset button.
  - Local state: `picked: string | null`. No data fetching, no router interaction.

- `frontend/src/routes/landing/LandingFeatures.tsx`
  - 6-card grid (`auto-fit, minmax(280px, 1fr)`), each card has a 40×40 indigo-50 background icon tile, title, and 1-sentence body. Icons are inline SVG paths transcribed from the design — six distinct Heroicons-style outlines.
  - Hover effect on cards: `translateY(-2px)` + `border-color: var(--indigo-300)`. Implemented via a `.feature-card:hover` rule in the `LandingScreen`-level `<style>` block (Tailwind's `hover:translate-y-*` works, but the combination with the border change reads cleaner as a single CSS rule).

- `frontend/src/routes/landing/LandingStats.tsx`
  - Dark inset banner (`bg-gray-900 rounded-2xl`) with 4 static stats from the design: `12,847 / Polls launched this week`, `2.1M / Responses collected`, `<200ms / Median response submit`, `0 / Tracking cookies set`.
  - 4-column grid that collapses to wrap-fit on narrow widths.

- `frontend/src/routes/landing/LandingCTA.tsx`
  - Final indigo CTA banner. White-on-indigo: headline + lead + two CTAs (primary white, secondary outline). Decorative white-dot radial-mask grid behind the text.

- `frontend/src/routes/auth/AuthSplit.tsx`
  - Replaces the current `AuthCard`. Provides the radial-gradient + dotted-grid backdrop, the own top bar (logo + "Back to home" link → `<Link to="/">`), and the two-column grid (`minmax(0, 1fr) 460px`). Children: a `side` prop for the branding column content, plus `children` for the form column.
  - Renders a decorative bottom-left floating `LiveResultsCard` (`-3deg` rotation, `0.85` opacity, `pointer-events: none`) absolutely positioned in the left column. Hidden below `~920px` viewport.

- `frontend/src/routes/auth/AuthBenefits.tsx`
  - Static 4-bullet benefit list, used by both `LoginScreen` and `RegisterScreen` inside their `AuthSplit` branding columns.

- `frontend/src/routes/auth/AuthFormCard.tsx`
  - White rounded shadow card that wraps the form on the right column. Single named export, accepts `children`.

- `frontend/src/lib/use-reduced-motion.ts`
  - `useReducedMotion()` hook returning a boolean. Reads `prefers-reduced-motion: reduce` and subscribes to changes. Consumed by `LiveResultsCard` and `LandingTryIt`. Full implementation in the Animations & motion section.

### Modified

- `frontend/src/router.tsx`
  - Split into two top-level groups (Architecture section above).
  - Add `import { LoginScreen, RegisterScreen, LandingScreen }` from their respective new paths (paths unchanged from today — the files themselves are rewritten).
  - The `/admin/*` Navigate redirects, the catch-all `'*'`, and all authenticated routes stay inside the `MainLayout` group, in their current order.

- `frontend/src/routes/landing/LandingScreen.tsx`
  - Rewritten to compose the 6 sections. Declares a single `<style>` block with `@keyframes pulse` and the `prefers-reduced-motion: reduce` overrides (which disable the rotation interval implicitly because `LiveResultsCard` reads `useReducedMotion` from a small util — see Animations).
  - Imports `LandingNav`, `LandingHero`, `LandingTryIt`, `LandingFeatures`, `LandingStats`, `LandingCTA`.

- `frontend/src/routes/auth/LoginScreen.tsx`
  - Rewritten. Outer wrapper is `AuthSplit` with:
    - `side`: "Welcome back" eyebrow badge, headline "Sign in to keep asking." (asking in indigo), lead paragraph, `<AuthBenefits />`.
    - children: `<AuthFormCard>` containing the form. Form uses the existing `useForm` + `zodResolver(loginSchema)` + `useLoginMutation` exactly as today. The "Forgot?" stub link sits inline next to the password label; its `onClick` calls `toast.info('Password reset is not implemented yet.')`.

- `frontend/src/routes/auth/RegisterScreen.tsx`
  - Rewritten. Same `AuthSplit` shell with:
    - `side`: "Free · No credit card" eyebrow, headline "Create your first poll in 60s." (first poll in indigo), lead paragraph, `<AuthBenefits />`.
    - children: `<AuthFormCard>` containing the form with name + email + password fields, helper text under the password input, Create account button, "Sign in" link, terms-of-service note below the card.

### Deleted

- `frontend/src/routes/auth/AuthCard.tsx` — superseded by `AuthSplit` + `AuthFormCard`. No other consumers (grep confirms).

## Animations & motion

A small `frontend/src/lib/use-reduced-motion.ts` util exposes:

```ts
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
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

Consumed by:
- `LiveResultsCard` — when `true`, no interval is set; the first poll renders with bars already at their final width (no transition).
- `LandingTryIt` — when `true`, the bar widths are set without a transition (rendered with `transition: none` style).

CSS-only animations (`@keyframes pulse` on the green dot, feature-card hover, button hovers) live in a `<style>` block at the bottom of `LandingScreen.tsx` and another in `AuthSplit.tsx`. Both blocks include a `@media (prefers-reduced-motion: reduce)` rule that disables the pulse keyframe.

## Responsive breakpoints

Mirrored from the design source:

| Section | Breakpoint | Behavior |
|---|---|---|
| `LandingHero` | `≤ 880px` | Two-column grid collapses to one (text first, card stack below). Card stack reduces height. |
| `LandingTryIt` | `≤ 880px` | Two-column grid collapses to one. |
| `LandingFeatures` | uses `auto-fit minmax(280px, 1fr)` | Naturally re-wraps; no manual breakpoint. |
| `LandingStats` | uses `auto-fit minmax(180px, 1fr)` | Naturally re-wraps. |
| `AuthSplit` | `≤ 920px` | Grid collapses to one column. Left column padding adjusts. Floating decorative `LiveResultsCard` is hidden. |

Implemented via `@media (max-width: 880px)` / `(max-width: 920px)` rules in the `<style>` blocks. Tailwind's `lg:` / `md:` breakpoints could substitute, but the design's chosen widths don't align with stock breakpoints and using exact-pixel breakpoints in CSS is simpler than configuring custom Tailwind breakpoints.

## Copy

Verbatim from `design/AuthScreens.jsx`. Exact strings the implementer needs:

**Landing eyebrow:** `Anonymous · Cookie-deduped · Free`

**Landing headline:** "Ask anyone. See it instantly." — with the word "instantly" wrapped in a `<span>` with the SVG underline beneath it (path `M4 14 Q 60 4, 120 12 T 236 8`).

**Landing lead:** "Single-choice, multiple-choice, and free-text polls. Share a link. Watch responses stream in. Export to CSV when you're done."

**Landing CTAs:** `Create your first poll` (primary, with arrow icon), `Sign in` (secondary).

**Trust strip:** 4 initials `AP`, `JK`, `SM`, `LZ` with the design's hue palette (`#e0e7ff/#4338ca`, `#dcfce7/#15803d`, `#dbeafe/#1d4ed8`, `#fee2e2/#b91c1c`). Counter text: "**12,847** polls launched this week".

**Try-It eyebrow:** `Try it`. Heading: "One click. Instant results." Lead: "No login. No friction. Pick an option and watch the bars fill — that's the same experience your respondents get." Question: "Tabs or spaces?" Options: `Tabs (64%)`, `Spaces (31%)`, `Either (5%)`. Live label: `Live · 3,127 responses`.

**Features eyebrow:** `Everything you need`. Heading: "Built for asking. Not a framework."

**Six features** (title — body):
1. `Three question types` — "Single-choice, multi-select, and free-text. Mix and match in one poll."
2. `Anonymous by default` — "Respondents need no account. Cookie-based dedup prevents accidental re-submits."
3. `Live analytics` — "Per-question breakdowns and a response timeline that updates as answers roll in."
4. `Public or private` — "Share a public link or generate a revocable access token. Regen it any time."
5. `Export to CSV` — "One click downloads a clean CSV of every response. Hook into your own pipeline."
6. `Admin panel` — "Manage every user and every poll in the system. Bulk actions, filters, export."

(Note: feature #6 says "Admin panel" — we keep the design's copy as-is even though our current admin surface is the dashboard tabs. The marketing wording is fine.)

**Stats:** `12,847 / Polls launched this week`, `2.1M / Responses collected`, `<200ms / Median response submit`, `0 / Tracking cookies set`.

**Final CTA banner:** Heading "Ready to ask?" Body: "Create a poll in under a minute. No credit card. Cancel by not signing in again." Buttons: `Get started free` (white-on-indigo) + `Sign in` (outline).

**Login branding side:** eyebrow `Welcome back`; headline "Sign in to keep asking." (asking in indigo); lead "Your polls, your responses, your analytics — pick up exactly where you left off."

**Login form card:** heading `Sign in`; subtitle "Enter your email and password."; button label `Sign in`. The "Forgot?" link sits inline beside the Password label. Footer: "Don't have an account? Create one".

**Register branding side:** eyebrow `Free · No credit card`; headline "Create your first poll in 60s." (first poll in indigo); lead "One account, unlimited polls. Share a link, collect responses, watch the bars fill."

**Register form card:** heading `Create account`; subtitle "Takes about a minute."; button label `Create account`. Helper under password: "Use 8+ characters with a mix of letters, numbers & symbols." Footer: "Already have an account? Sign in". Terms line below the card: "By creating an account you agree to our Terms of Service and Privacy Policy."

**Auth top bar:** logo + "Polls" wordmark on the left, "Back to home" link (with left-arrow icon) on the right.

## Tests

Per the project's deferred-TDD preference, no new unit tests are written. The existing e2e suite (`frontend/e2e/auth-and-polls.spec.ts`, `frontend/e2e/admin.spec.ts`) keeps working because it interacts with the auth forms by accessible role/label — not by CSS classes — and the form fields keep their labels (`Email`, `Password`, `Name`, `Create account` button, `Sign in` button). Run the existing suite after the change to confirm.

If any existing e2e selector breaks because of structural changes (e.g., the registration form is now nested deeper inside `AuthSplit > AuthFormCard`), update the selector — don't loosen the assertion.

## Acceptance criteria

1. Visiting `/` anonymously renders, in order: sticky transparent-blur top nav with logo + Sign in + Get started; hero with the design's headline (including the SVG underline beneath "instantly"), eyebrow, lead, 2 CTAs, trust strip, and animated 3-card live-results stack on the right; interactive Try-It poll; 6-feature card grid; dark stats banner with the four design numbers; final indigo CTA banner.
2. The hero's `LiveResultsCard` stack cycles between the three polls from the design (workload / framework / offsite) every ~4.5s. Bar widths animate from 0 to their percentage on each swap with the design's `cubic-bezier` curve. Under `prefers-reduced-motion: reduce`, no interval runs and the first poll renders statically with bars already filled.
3. Clicking any option in the Try-It section reveals the result bars with animated fill (or instant fill under reduced motion); a Reset link returns to the unfilled state.
4. `/login` anonymously renders the AuthSplit: own top bar with logo + "Back to home"; left column has eyebrow "Welcome back" + headline "Sign in to keep asking." + lead + benefits list; right column has the form card with email + password (with stub "Forgot?" link) + Sign in button + "Create one" link. No demo-credentials line.
5. Clicking the stub "Forgot?" link shows a `toast.info('Password reset is not implemented yet.')` and does not navigate.
6. `/register` anonymously renders the same AuthSplit with the register-side eyebrow + headline + form (name + email + password with helper text + Create account button + "Sign in" link + terms text).
7. The global `MainLayout.Header` does not render on `/`, `/login`, or `/register`. It still renders on every authenticated route (`/dashboard*`, `/polls/*`, `/p/:slug`).
8. At viewport widths `≤ 920px` the AuthSplit collapses to one column and hides the floating decorative `LiveResultsCard`. At `≤ 880px` the landing hero and try-it sections collapse to single column.
9. Existing e2e suite (`npm run test:e2e`) still passes — the auth forms remain reachable by label/role.
10. No TypeScript errors (`npx tsc --noEmit` clean) and no new ESLint warnings against the new files.
