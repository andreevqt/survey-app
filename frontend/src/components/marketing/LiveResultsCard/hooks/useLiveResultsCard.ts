import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../../../lib/use-reduced-motion';
import {
  ROTATING_POLLS,
  FILL_DELAY_MS,
  ROTATE_OUT_MS,
  ROTATE_INTERVAL_MS,
} from '../constants';
import type { Poll } from '../types';

type ViewModel = {
  poll: Poll;
  max: number;
  fill: boolean;
  reduced: boolean;
  idx: number;
};

export function useLiveResultsCard(delay: number): ViewModel {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [fill, setFill] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const start = setTimeout(() => setFill(true), FILL_DELAY_MS + delay);
    return () => clearTimeout(start);
  }, [idx, delay, reduced]);

  useEffect(() => {
    if (reduced) return;
    let inner: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setFill(false);
      inner = setTimeout(() => setIdx((p) => (p + 1) % ROTATING_POLLS.length), ROTATE_OUT_MS);
    }, ROTATE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (inner) clearTimeout(inner);
    };
  }, [reduced]);

  const poll = ROTATING_POLLS[idx];
  const max = Math.max(...poll.options.map((o) => o.pct));

  return { poll, max, fill, reduced, idx };
}
