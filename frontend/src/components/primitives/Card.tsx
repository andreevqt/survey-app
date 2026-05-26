import { HTMLAttributes } from 'react';

type Size = 'sm' | 'md' | 'lg';
const PAD: Record<Size, string> = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export function Card({ size = 'md', className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { size?: Size }) {
  return (
    <div className={`rounded-lg bg-white border border-gray-200 shadow-sm ${PAD[size]} ${className}`} {...rest} />
  );
}
