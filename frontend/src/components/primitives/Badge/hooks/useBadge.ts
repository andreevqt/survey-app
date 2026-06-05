import clsx from 'clsx';
import type { BadgeProps } from '../types';
import { BADGE_BASE, BADGE_VARIANT_CLS } from '../constants';

export function useBadge({ variant = 'default' }: Pick<BadgeProps, 'variant'>) {
  const className = clsx(BADGE_BASE, BADGE_VARIANT_CLS[variant]);
  return { className };
}
