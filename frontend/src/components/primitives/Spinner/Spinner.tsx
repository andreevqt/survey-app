import type { SpinnerProps } from './types';
import { useSpinner } from './hooks/useSpinner';

export function Spinner(props: SpinnerProps) {
  const { style } = useSpinner(props);
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={style}
    />
  );
}
