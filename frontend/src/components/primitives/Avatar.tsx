type Size = 'sm' | 'md' | 'lg';
const SIZES: Record<Size, string> = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ name, size = 'md', variant = 'light' }: { name?: string; size?: Size; variant?: 'light' | 'dark' }) {
  const initials = (name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const palette = variant === 'dark' ? 'bg-gray-700 text-white' : 'bg-indigo-100 text-indigo-700';
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold ${SIZES[size]} ${palette}`}>
      {initials}
    </span>
  );
}
