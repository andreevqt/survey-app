import type { BadgeProps } from './types';
import { useBadge } from './hooks/useBadge';

export function Badge({ variant, children }: BadgeProps) {
  const { className } = useBadge({ variant });
  return <span className={className}>{children}</span>;
}
