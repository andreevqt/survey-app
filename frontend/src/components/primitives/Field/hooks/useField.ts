import type { FieldProps } from '../types';

interface UseFieldResult {
  hasError: boolean;
}

export function useField({ error }: Pick<FieldProps, 'error'>): UseFieldResult {
  return {
    hasError: !!error,
  };
}
