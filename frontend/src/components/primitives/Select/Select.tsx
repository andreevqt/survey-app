import { forwardRef } from 'react';
import type { SelectProps } from './types';
import { useSelect } from './hooks/useSelect';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  const derived = useSelect({ className });
  return (
    <select ref={ref} className={derived.className} {...rest}>
      {children}
    </select>
  );
});
