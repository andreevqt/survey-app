import { ReactNode } from 'react';

type Variant = 'default' | 'success' | 'info' | 'danger';
const CLS: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-600',
  info: 'bg-indigo-50 text-indigo-700',
  danger: 'bg-red-50 text-red-600',
};

export function Badge({ variant = 'default', children }: { variant?: Variant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CLS[variant]}`}>
      {children}
    </span>
  );
}
