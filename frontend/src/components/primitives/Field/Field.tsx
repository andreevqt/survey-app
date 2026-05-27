import type { FieldProps } from './types';
import { useField } from './hooks/useField';

export function Field({ label, htmlFor, error, children }: FieldProps) {
  const { hasError } = useField({ error });
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {children}
      {hasError && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
