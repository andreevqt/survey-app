import type { AvatarProps, AvatarSize, AvatarVariant } from '../types';

const SIZES: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

function getInitials(name?: string): string {
  return (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getPalette(variant: AvatarVariant): string {
  return variant === 'dark' ? 'bg-gray-700 text-white' : 'bg-indigo-100 text-indigo-700';
}

export function useAvatar({ name, size = 'md', variant = 'light' }: AvatarProps) {
  const initials = getInitials(name);
  const className = `inline-flex items-center justify-center rounded-full font-semibold ${SIZES[size]} ${getPalette(variant)}`;
  return { initials, className };
}
