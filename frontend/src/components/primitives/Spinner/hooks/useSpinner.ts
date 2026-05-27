import type { SpinnerProps } from '../types';

export function useSpinner({ size = 16 }: SpinnerProps) {
  const style = { width: size, height: size };
  return { style };
}
