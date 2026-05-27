import { forwardRef } from 'react';
import type { TextareaProps } from './types';
import { useTextarea } from './hooks/useTextarea';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows, ...rest },
  ref,
) {
  const derived = useTextarea({ className, rows });
  return <textarea ref={ref} rows={derived.rows} className={derived.className} {...rest} />;
});
