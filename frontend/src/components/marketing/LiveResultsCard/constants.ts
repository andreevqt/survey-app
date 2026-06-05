import type { Poll } from './types';

/** Delay before bars start filling after a poll becomes visible. */
export const FILL_DELAY_MS = 200;
/** Time for bars to collapse before rotating to the next poll. */
export const ROTATE_OUT_MS = 350;
/** Interval between automatic poll rotations. */
export const ROTATE_INTERVAL_MS = 4500;
/** Card width in px. */
export const CARD_WIDTH = 340;
/** Base duration of a bar fill animation. */
export const BAR_BASE_MS = 900;
/** Extra delay per bar index, for the staggered fill effect. */
export const BAR_STAGGER_MS = 120;

export const ROTATING_POLLS: readonly Poll[] = [
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
