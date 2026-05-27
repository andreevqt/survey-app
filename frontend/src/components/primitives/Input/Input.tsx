import { forwardRef } from 'react';
import type { InputProps } from './types';
import { useInput } from './hooks/useInput';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  const derived = useInput({ className });
  return <input ref={ref} className={derived.className} {...rest} />;
});
