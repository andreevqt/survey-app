import type { Option } from './types';

/** Base duration of a bar fill animation. */
export const BAR_BASE_MS = 800;
/** Extra delay per bar index, for the staggered fill effect. */
export const BAR_STAGGER_MS = 150;
/** Fake live response count shown in the demo card. */
export const RESPONSES_LABEL = '3,127';

export const OPTIONS: readonly Option[] = [
  { t: 'Tabs', pct: 64 },
  { t: 'Spaces', pct: 31 },
  { t: 'Either', pct: 5 },
] as const;
