import { useState } from 'react';
import { useReducedMotion } from '../../../../lib/use-reduced-motion';
import type { Option } from '../types';

const OPTIONS: readonly Option[] = [
  { t: 'Tabs', pct: 64 },
  { t: 'Spaces', pct: 31 },
  { t: 'Either', pct: 5 },
] as const;

type ViewModel = {
  picked: string | null;
  setPicked: (v: string | null) => void;
  reduced: boolean;
  max: number;
  options: readonly Option[];
};

export function useLandingTryIt(): ViewModel {
  const [picked, setPicked] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const max = Math.max(...OPTIONS.map((o) => o.pct));

  return { picked, setPicked, reduced, max, options: OPTIONS };
}
