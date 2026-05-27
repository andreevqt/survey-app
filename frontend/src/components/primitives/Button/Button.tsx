import { forwardRef } from 'react';
import type { ButtonProps } from './types';
import { useButton } from './hooks/useButton';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, isLoading, disabled, className, children, ...rest },
  ref,
) {
  const derived = useButton({ variant, size, isLoading, disabled, className });
  return (
    <button ref={ref} disabled={derived.disabled} className={derived.className} {...rest}>
      {isLoading ? 'Loading…' : children}
    </button>
  );
});
