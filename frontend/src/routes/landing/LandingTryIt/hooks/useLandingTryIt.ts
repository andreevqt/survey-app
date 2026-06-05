import { useState } from 'react';
import { useReducedMotion } from '../../../../lib/use-reduced-motion';
import { OPTIONS } from '../constants';
import type { Option } from '../types';

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
