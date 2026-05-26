import { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
