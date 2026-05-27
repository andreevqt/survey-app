import type { BadgeProps, BadgeVariant } from '../types';

const CLS: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-600',
  info: 'bg-indigo-50 text-indigo-700',
  danger: 'bg-red-50 text-red-600',
} as const;

export function useBadge({ variant = 'default' }: Pick<BadgeProps, 'variant'>) {
  const className = `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CLS[variant]}`;
  return { className };
}
