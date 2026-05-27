import type { CardProps, CardSize } from '../types';

const PAD: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export function useCard({ size = 'md', className = '' }: Pick<CardProps, 'size' | 'className'>) {
  return { className: `rounded-lg bg-white border border-gray-200 shadow-sm ${PAD[size]} ${className}` };
}
