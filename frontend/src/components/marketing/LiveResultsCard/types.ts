export type PollOption = { t: string; pct: number };

export type Poll = {
  q: string;
  responses: number;
  options: readonly PollOption[];
};

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

export type LiveResultsCardProps = {
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  offset?: { x: number; y: number };
  delay?: number;
};
